const qserver = require('../quotes');

const loginURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiLogin';
const ValURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiValidate';
require('console-stamp')(console, '[HH:MM:ss.l]');

var ws;

async function wsOps(uid, action, tpt)
{
    var response = 'failed to connect';
    if (action === 'connect') {
        var lr = await apiLogin(tpt);

        if (lr.data != undefined && lr.data.status === 'success') {
            var vr = await apiValidate({
                'sid': lr.data.sid,
                'token': lr.data.token
            });
            wsconnect(vr.data.baseUrl.substring(8), lr.data.token, vr.data.sid, uid);
            response = 'connected';
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
            mobileNumber: "***REMOVED***",
            ucc: "***REMOVED***",
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
            mpin:'***REMOVED***' 
        }),
    };
    const response = await fetch(ValURL, headers);
    return await response.json();
}

function wsconnect(baseurl, token, sid, uid)
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
            if(message.type === 'order')
                message.data = standardizeO(message.data);
            qserver.emitUpdates(uid, message);
        } catch(error) {
            console.log(error);
        }          
    };

    ws.onerror = (event) => {
        console.log("connection error " + event);
    }; 
    
    ws.onclose = (event) => {
        console.log("connection closed " + event.reason);
    };
}

function standardizeO(order)
{
    const {trdSym: symbol, nOrdNo: orderid, ordSt: state, avgPrc: pricedAt, prc: price, prod: product, 
        trnsTp: action, fldQty: filled_q, unFldSz: unfilled_q, qty: quantity, prcTp: pricetype, ...rest} = order;

    var updatedorder = {symbol, orderid, state, pricedAt, filled_q, unfilled_q, quantity, pricetype, ...rest};
    if(updatedorder.state === 'open')
        updatedorder.state = 'opened';
    
    updatedorder.action = updatedorder.action === 'B' ? 'BUY' : 'SELL';
    
    return updatedorder;
}

module.exports = {
    wsOps
  };
