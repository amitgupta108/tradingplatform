const qserver = require('../quotes');

const loginURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiLogin';
const ValURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiValidate';
require('console-stamp')(console, '[HH:MM:ss.l]');
var authdata;
var wsping;
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
            authdata = {sid: lr.data.sid, token: lr.data.token}; 
            response = 'connected';
        }
    }
    else if (ws != undefined && action === 'disconnect') {
        wshb('stop');
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
    const {nOrdNo: orderid, ordSt: state, avgPrc: pricedAt, prc: price, prod: product, sym: stockCode,
            expDt: expiry_date, stkPrc: strike_price, optTp: right, trnsTp: action, fldQty: filled_q, unFldSz: unfilled_q,
            qty: quantity, prcTp: pricetype, ...rest} = order;

    var uOrder = {orderid, state, pricedAt, price, product, stockCode, expiry_date, strike_price, right, action,
                        filled_q, unfilled_q, quantity, pricetype, ...rest};
    
    if(uOrder.state === 'open')
        uOrder.state = 'opened';
    
    uOrder.action = uOrder.action === 'B' ? 'BUY' : 'SELL';
    uOrder.expiry_date = uOrder.expiry_date.replaceAll(', 20', '').replaceAll(' ', '').toUpperCase();
    uOrder.strike_price = uOrder.strike_price.replace('.00', '');
    uOrder.symbol = uOrder.stockCode + uOrder.expiry_date +  uOrder.strike_price + uOrder.right;

    return uOrder;
}

async function wshb(action)
{
  if(action === 'start') {
    if(wsping !== undefined)
      clearInterval(wsping);

    wsping = setInterval(() => {
        qserver.broadcast({type: 'hb', data: ws.readyState});
    }, 60000);

    if(ws.readyState !== 1) {
        console.log('Attempting reconnection');
        var vr = await apiValidate({
            'sid': authdata.sid,
            'token': authdata.token
        });
        wsconnect(vr.data.baseUrl.substring(8), authdata.token, authdata.sid, uid);
    }
  }
  else
  {
    qserver.broadcast({type: 'hb', data: 0});
    clearInterval(wsping);
  }
}

module.exports = {
    wsOps
  };