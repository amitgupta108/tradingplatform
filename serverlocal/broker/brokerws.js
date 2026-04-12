const qserver = require('../quotes');

const loginURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiLogin';
const ValURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiValidate';
require('console-stamp')(console, '[HH:MM:ss.l]');
var ws;

function wsOps(uid, action, tpt, mode){
    if(mode === 1)
        wsOpsLive(uid, action, tpt);
    else
        wsOpsSim(uid, action, tpt);
}

async function wsOpsLive(uid, action, tpt)
{
    var response = 'unknown state or action';
    if (action === 'connect') {
        var lr = await apiLogin(tpt);

        if (lr.data != undefined && lr.data.status === 'success') {
            var vr = await apiValidate({
                'sid': lr.data.sid,
                'token': lr.data.token
            });
            ws = wsconnect(vr.data.baseUrl.substring(8), lr.data.token, vr.data.sid, uid);
            response = 'connected';
        }
        else{
            console.log(JSON.stringify(lr));
            response = 'failed to connect';
        }
    }
    else if (ws != undefined && action === 'disconnect') {
        ws.close();
        response = 'closed';
    }
    else if(ws != undefined && action === 'isAlive') {
        response = ws.readyState;
        qserver.emitUpdates(uid, {type: 'hb', data: response});
    }
    else
        console.log('wsOps: ' + response);
    
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

async function apiValidate(headers) {
    var headers = {
        method: "POST",
        timeout: 0,
        headers: {
            'Authorization': '3ed099c0-1a60-4a65-b24f-8c42747ecffa',
            'neo-fin-key': 'neotradeapi',
            'Content-Type': "application/json",
            'sid': headers.sid,
            'Auth': headers.token
        },
        body: JSON.stringify({
            mpin:'221818' 
        }),
    };
    const response = await fetch(ValURL, headers);
    return await response.json();
}

function wsconnect(baseurl, token, sid, uid)
{
    var ws = new WebSocket(`wss://${baseurl}/realtime`);

    ws.onopen = (event) => {
        const payload = `{type:cn,Authorization:${token},Sid:${sid},src:WEB}`;
        ws.send(payload);
        console.log('On open ');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("message type: " + message.type)
        qserver.emitUpdates(uid, message);
    };

    ws.onerror = (event) => {
        console.log("connection error " + event);
    }; 
    
    ws.onclose = (event) => {
        console.log("connection closed " + event.reason);
    };

    return ws;
}

async function wsOpsSim(uid, action, tpt)
{
    var response = 'unknown state or action';
    if (action === 'connect') {

        if (tpt === 111111) {
            ws = wsconnectSim(uid);
            response = 'connected';
        }
        else{
            response = 'failed to connect';
        }
    }
    else if (ws != undefined && action === 'disconnect') {
        ws = undefined;
        response = 'closed';
    }
    else if(ws != undefined && action ==='isAlive') {
        response = ws.state;
        qserver.emitUpdates(uid, {type: 'hb', data: response});
    }
    else
        console.log('wsOps: ' + response);
    
    return response;
}

function wsconnectSim(uid)
{
    var ws = {};

    ws.onopen = (event) => {
        ws.state = 'live';
        console.log('On open ');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("message type: " + message.type)
        qserver.emitUpdates(message);
    };

    return ws;
}

module.exports = {
    wsOps,
  };
