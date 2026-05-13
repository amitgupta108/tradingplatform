import qserver from '../quotes.mjs';
import Order_Service from '../service/order_engine.mjs'

const loginURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiLogin';
const ValURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiValidate';
var authdata;
var wsping;
var ws;

async function wsOps(action, tpt)
{
    var response = 'failed to connect';
    if (action === 'connect') {
        var lr = await apiLogin(tpt);

        if (lr.data != undefined && lr.data.status === 'success') {
            authdata = {sid: lr.data.sid, token: lr.data.token}; 
            var vr = await apiValidate(authdata);
            wsconnect(vr.data.baseUrl.substring(8), vr.data.token, vr.data.sid);
            response = 'connection initiated';
        }
    }
    else if (ws != undefined && action === 'disconnect') {
        ws.close();
        response = 'disconnected';
    }
    return response;
}

async function apiLogin(num)
{
    var headers = {
        method: "POST",
        timeout: 0,
        headers: {
            "Authorization": '3ed099c0-1a60-4a65-b24f-8c42747ecffa',
            "neo-fin-key": 'neotradeapi',
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            mobileNumber: "+919871394231",
            ucc: "V1Z9A",
            totp: num
        }),
    };
    const response = await fetch(loginURL, headers);
    return await response.json();
}

async function apiValidate(authdata) {
    var headers = {
        method: "POST",
        timeout: 0,
        headers: {
            'Authorization': '3ed099c0-1a60-4a65-b24f-8c42747ecffa',
            'neo-fin-key': 'neotradeapi',
            'Content-Type': "application/json",
            'sid': authdata.sid,
            'Auth': authdata.token
        },
        body: JSON.stringify({
            mpin:'221818' 
        }),
    };
    const response = await fetch(ValURL, headers);
    return response.json();
}

function wsconnect(baseurl, token, sid)
{
    ws = new WebSocket(`wss://${baseurl}/realtime`);

    ws.onopen = (event) => {
        const payload = `{type:cn,Authorization:${token},Sid:${sid},src:WEB}`;
        ws.send(payload);
        console.log('On open ');
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            console.log("message type: " + message.type)
            if(message.type === 'cn' && message.msg === "connected")
                wshb('start');
            else if(message.type === 'order') {
                Order_Service.liveOrderMatching(message);
            }
        } catch(error) {
            console.log(error);
        }          
    };

    ws.onerror = (event) => {
        console.log("connection error " + JSON.stringify(event));
    }; 
    
    ws.onclose = (event) => {
        wshb('stop');
        console.log("connection closed " + event.reason);
    };
}

function wshb(action)
{
    qserver.broadcast('hb', {order_socket: ws.readyState});

    if(action === 'start') {
        if(wsping !== undefined)
            clearInterval(wsping);

        var recon_attempt = 0;
        wsping = setInterval(async (rn) => {
            qserver.broadcast('hb', {order_socket: ws.readyState});
    
            if(ws.readyState !== 1 && rn <= 5) {
                console.log('Attempting reconnection');
                var vr = await apiValidate(authdata);
                wsconnect(vr.data.baseUrl.substring(8), vr.data.token, vr.data.sid);
                rn++;
            }
        }, 120000, recon_attempt);
    }
    else
    {
        qserver.broadcast('hb', {order_socket: ws.readyState});
        clearInterval(wsping);
    }
}

export default wsOps;