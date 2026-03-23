const utils = require('../../common/utils');
const adapter = require('../adapter/histadapter');

require('console-stamp')(console, '[HH:MM:ss.l]');

function connect()
{
    adapter.connect(onmessage);
}

function onmessage(q){
    console.log(JSON.stringify(q));
}

function subscribe(sublist, callback)
{
    adapter.subscribe_ltp(sublist, callback);
}

function unsubscribe(sublist)
{
    adapter.unsubscribe_ltp(sublist);
}

function standardizeq(q) 
{
    q['exchange'] = q['exchange_code'];
    q['type'] = q['product_type'];

    q.expiry_date = q.expiry_date.replaceAll('-20', '').replaceAll('-', '');

    if (q.type === 'Options')
        q.symbol = q.stock_code + q.expiry_date + q.strike_price + (q.right === 'Call' ? 'CE' : 'PE');
    else if (q.type === 'Futures')
        q.symbol = q.stock_code + q.expiry_date + 'FUT';

    q.ltt = Date.parse(q.datetime);
    
    return q;
}

function preU(p) {
    p.exchange = 'NSE';
    return adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');
}

function preF(p) {
    p.expiry = p.fExpiry;
    p.type = "futures";
    p.exchange = 'NFO';
    return adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');;
}

function preD(p, uq) {
    p.type = "options";
    p.expiry = p.oExpiry;

    p.strike = Math.round(uq.close / 50 - 3) * 50;
    p.right = "Put";
    var pQ = adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');

    p.strike = Math.round(uq.close / 50 + 3) * 50;
    p.right = "Call";
    var cQ = adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');

    return [pQ, cQ];
}

module.exports = {
    subscribe,
    connect,
    unsubscribe,
    standardizeq,
    preU,
    preF,
    preD
  };