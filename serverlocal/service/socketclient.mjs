import qserver from '../stream.mjs';
import ordermanager from './ordermanager.mjs';
import kotak_service from '../broker/m_t_kotakneo.mjs';
import services from './services.mjs';
import connector from './kotak/connector.os.mjs';
import path from 'path';

const name = path.parse(import.meta.filename).name;
const logical_trade_name = 'KOTAKNEOTRADE';
var authenticated = false;
var wsping;
var ws_hsi;
var ws_hsm;

function hsmconnect()
{
    if(ws_hsm?.readyState === 1)
        return;
    
    if (authenticated !== true)
        return { status: 'credentials not available' };
    
    ws_hsm = new WebSocket(`wss://${process.env.kotak_hsmURL}`);

    ws_hsm.onopen = (event) => {
        let authdata = connector.getCredentials();
        if(authdata !== undefined)
        {
            //const payload = `{Authorization:${hsm_token},Sid:${hsm_sid},type:cn}`;
            const payload = JSON.stringify({Authorization: authdata.hsm_token, Sid: authdata.hsm_sid, type: 'cn'});
            ws_hsm.send(payload);
            wshb('hsm', 'start');
            console.log('On open hsm');
        }   
    };

    ws_hsm.onmessage = (event) => {
        try {
            const message = JSON.parse(event);
            console.log('HSM Message received ' + JSON.stringify(message));
            //kotak_neo.onQuotes(message);
        } catch(error) {
            console.log('error hsm: ' + error);
        }          
    };

    ws_hsm.onerror = (event) => {
        console.log("connection error hsm" + JSON.stringify(event));
    }; 
    
    ws_hsm.onclose = (event) => {
        console.log("connection closed hsm" + event.reason);
    };
}

async function hsiconnect()
{
    if(ws_hsi?.readyState === 1)
        return;
    
    const authdata = await connector.getSavedCredentials();
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
            ordermanager.notifyme(message);
        }
        else if(message.type === 'cn' && message.msg === 'connected'){
            kotak_service.notifyme(true);
            wshb('hsi', 'start');
        }
    };

    ws_hsi.onerror = (event) => {
        console.log("connection error hsi" + JSON.stringify(event));
    }; 
    
    ws_hsi.onclose = (event) => {
        console.log("connection closed hsi" + event.reason);
    };
}

function wshb(type, action)
{
    console.log("websocket heartbeat: " + type + ' - ' + action);
    qserver.broadcast('hb', {order_socket: ws_hsi?.readyState});

    if(action === 'start') {
        if(wsping !== undefined)
            clearInterval(wsping);

        var recon_attempt = 0;
        wsping = setInterval(async (rn) => 
        {            
            qserver.broadcast('hb', { order_socket: ws_hsi?.readyState });
            if(ws_hsi?.readyState !== 1 && rn <= 5) {
                console.log('Attempting reconnection ' + rn);
                hsiconnect()
                .then(() => {})
                .catch((error) => console.log('reconnection error ' + rn));
                rn++;
            }
        }, 120000, recon_attempt);
    }
}

async function authenticate(tpt) {
    let response =  await connector.authenticate(tpt);
    if(response.status === 'success')
        authenticated = true;
    return response;
}

async function init()
{
    let response = await connector.getSavedCredentials();
    if(response !== undefined) {
        console.log('valid authdata found');
        authenticated = true;
    }
    
    return response;
}
export default {name, hsiconnect, init, authenticate };