const adapter = require('../adapter/histadapter');
require('console-stamp')(console, '[HH:MM:ss.l]');

function connect(uid, time, callback)
{
    adapter.connect(uid, time, callback);
}

function subscribe(uid, instruments)
{
    adapter.subscribe(uid, instruments, true);
}

function unsubscribe(uid, instruments)
{
    adapter.subscribe(uid, instruments, false);
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
    preU,
    preF,
    preD
  };