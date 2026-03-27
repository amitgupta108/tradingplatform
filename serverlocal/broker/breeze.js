const adapter = require('../adapter/histadapter');
require('console-stamp')(console, '[HH:MM:ss.l]');

var orderid = 50001;
var orders = new Map();

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

async function order(p)
{
    var response = {orderid: orderid, status: "success"};
    orders.set(orderid++, p);

    return response;
}

async function orderstatus(orderid)
{
    var order = orders.get(orderid);
    var status = {
        action: order.action,
        average_price: Math.round(Number(order.cprice)) + Math.round((new Date()).getMilliseconds()/100) * 0.05,
        exchange: order.exc,
        order_status: "complete",
        orderid: orderid,
        price: 0,
        pricetype: "MARKET",
        product: "MIS",
        quantity: order.quantity,
        symbol: order.symbol,
        timestamp: order.time + 500,
        trigger_price: 0,
        status: "success"
      }
    return status;
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
    preD,
    order,
    orderstatus
  };