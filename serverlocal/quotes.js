require('console-stamp')(console, '[HH:MM:ss.l]');
const utils = require('./../common/utils');
const Session = require('./session/session');

var socketmap = new Map();

function emitQuotes(uid, q, mode)
{ 
    if(mode === 'history')
        standardizehq(q);
    else
        standardizelq(q);

    emitQs(uid, q);
}

function standardizehq(q) 
{
    q['exchange'] = q['exchange_code'];
    q['type'] = q['product_type'];

    if(q.exchange != 'NSE')
        q.expiry_date = q.expiry_date.replaceAll('-20', '').replaceAll('-', '');

    if (q.type === 'Options')
        q.symbol = q.stock_code + q.expiry_date + q.strike_price + (q.right === 'Call' ? 'CE' : 'PE');
    else if (q.type === 'Futures')
        q.symbol = q.stock_code + q.expiry_date + 'FUT';

    q.ltt = Date.parse(q.datetime);
    
    return q;
}

function standardizelq(q) 
{
    q.close = q.ltp;
    q.exchange = q.exchange === 'NSE_INDEX' ? 'NSE' : q.exchange;
    if (q.symbol.endsWith('PE') || q.symbol.endsWith('CE')) {
        q.right = q.symbol.slice(-2) === 'CE' ? 'Call' : 'Put';

        var strike = q.symbol.slice(-9, -2);
        var digit5 = Number.isFinite(Number(strike));
        q.strike_price = digit5 ? strike.slice(2, 7) : strike.slice(3, 7);
        q.expiry_date = digit5 ? q.symbol.slice(-14, -7) : q.symbol.slice(-13, -6);
    }
    return q;
} 

function emitQs(uid, q)
{
    try {
        var sn = Session.usn(uid);
        var key = 'strikex';
        if (q.exchange === 'NSE' || (q.exchange === 'MCX' && q.symbol.endsWith('FUT')))
        {
            sn.lastuq(q);
            key = 'index';
        }
        else if (q.exchange === 'NFO' && q.symbol.endsWith('FUT'))
            key = 'futures';
        else if (q.symbol.endsWith('CE') || q.symbol.endsWith('PE'))
            utils.addIVNDelta(q, sn.lastuq());

        emit(uid, key, q);
    } catch(error){
        console.log(error);
    }
}

function emitUpdates(uid, message)
{
    try {
        console.log("ws message: ", JSON.stringify(message));

        if (message.type === "cn")
            emit(uid, 'ws-' + message.type, message.msg);
        else
            emit(uid, 'ws-' + message.type, message.data);
    } catch (error) {
        console.log(error);
    }
}

function emit(uid, event, msg){
    var s = socketmap.get(uid);
    s.emit(event, msg);
}

module.exports = {
    socketmap,
    emitQuotes,
    emitUpdates,
    emit
}