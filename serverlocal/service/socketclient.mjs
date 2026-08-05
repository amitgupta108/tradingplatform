import qserver from '../stream.mjs';
import ordermanager from './ordermanager.mjs';
let reconnect = true;
let authdata;
let wsping;
let ws_hsi;

function hsiconnect(auth_data){
    authdata = auth_data;
    if (ws_hsi?.readyState === 1)
        return;

    connect();
}

function connect()
{
    ws_hsi = new WebSocket(`wss://${authdata.baseUrl.substring(8)}/realtime`);
    ws_hsi.onopen = (event) => {
        const payload = `{type:cn,Authorization:${authdata.hsi_token},Sid:${authdata.hsi_sid},src:WEB}`;
        ws_hsi.send(payload);
        console.log('On open hsi ');
    };

    ws_hsi.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if(message.type === 'order'){
            ordermanager.notifyme(message, 'LIVE');
        }
        else if(message.type === 'cn' && message.msg === 'connected'){
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
    if(reconnect) {
        connect();
        console.log('hsi reconnection attempt ' + response.status);
    }
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

export default { hsiconnect };