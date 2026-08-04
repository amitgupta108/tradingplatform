import qserver from '../stream.mjs';
import ordermanager from './ordermanager.mjs';
import kotak_service from '../broker/m_t_kotakneo.mjs';
import services from './services.mjs';
import connector from './kotak/connector.os.mjs';
import { eventservice } from './eventservice.mjs';
import path from 'path';

const name = path.parse(import.meta.filename).name;
const logical_trade_name = 'KOTAKNEOTRADE';
var authenticated = false;
var wsping;
var ws_hsi;

async function hsiconnect()
{
    if(ws_hsi?.readyState === 1)
        return;
    
    const authdata = await getSavedCredentials();
    if(authdata === undefined)
        return {status: 'error', reason: 'credentials not available'};
    
    ws_hsi = new WebSocket(`wss://${authdata.baseUrl.substring(8)}/realtime`);
    ws_hsi.onopen = (event) => {

        const payload = `{type:cn,Authorization:${authdata.hsi_token},Sid:${authdata.hsi_sid},src:WEB}`;
        ws_hsi.send(payload);
        console.log('On open hsi ');
    };

    ws_hsi.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if(message.type === 'order'){
            const trade_mode = services.getProviderModeKey(logical_trade_name, 'trade')?.at(0);
            ordermanager.notifyme(message, trade_mode);
        }
        else if(message.type === 'cn' && message.msg === 'connected'){
            kotak_service.notifyme(authdata);
            wshb('hsi', 'start');
        }
    };

    ws_hsi.onerror = (event) => {
        console.log("connection error hsi" + JSON.stringify(event));
    };

    ws_hsi.onclose = (event) => {
        console.log("connection closed hsi" + event.reason);
        hsiReconnect();
    };
    return { status: 'hsi connect initiated' };
}

function hsiReconnect()
{
    console.log('Attempting reconnection ');
    hsiconnect()
    .then((response) => console.log('hsi reconnection attempt ' + response))
    .catch((error) => console.log('reconnection error ' + error));
}

function wshb(type, action) 
{
    console.log("websocket heartbeat: " + type + ' - ' + action);
    qserver.broadcast('hb', { order_socket: ws_hsi?.readyState });

    if (action === 'start') {
        if (wsping !== undefined)
            clearInterval(wsping);

        wsping = setInterval(async () => {
            qserver.broadcast('hb', { order_socket: ws_hsi?.readyState });
        }, 120000);
    }
}

async function authenticate(tpt) 
{
    let response = await connector.authenticate(tpt);
    if (response.status === 'success') {
        authenticated = true;
        hsiconnect();
    }
    return response;
}

function getSavedCredentials()
{
    return connector.getSavedCredentials();
}

async function init()
{
    if(!authenticated) {
        eventservice.addListener('kotak_auth', (authdata) => {
            this.authdata = authdata;
            //hsiconnect();
        });
        let response = await getSavedCredentials();
        if(response !== undefined) {
            authenticated = true;
            hsiconnect();
            return { status: 'success: valid authdata found'};
        }
        return { status: 'authdata not available' };
    }
    return {status: 'already authenticated'};
}
export default {name, init, authenticate, getSavedCredentials };
