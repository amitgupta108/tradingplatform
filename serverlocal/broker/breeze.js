const adapter = require('../adapter/histadapter');
const qserver = require('../quotes');

require('console-stamp')(console, '[HH:MM:ss.l]');

var orderid = 50001;
var orders = new Map();

function connect(uid, time)
{
    adapter.connect(uid, time);
}

function disconnect(uid)
{
    adapter.disconnect(uid);
}

function subscribe(uid, instruments, action, speed)
{
    adapter.subscribe(uid, instruments, action, speed);
}

function changeSpeed(uid, speed)
{
    adapter.changeSpeed(uid, speed);
}

function order(p)
{
    var status = Date.now() % 11 === 0 ? 'failure' : 'success';
    var response = {orderid: orderid, status: status};
    orders.set(orderid++, p);

    return response;
}

function orderstatus(orderid)
{
    var order = orders.get(orderid);
    
    var response = 'complete';
    if(order.status === 'failure')
        response = 'submission failed';
    var response = Date.now() % 20 === 0 ? 'rejected' : 'complete';

    var status = {
        action: order.action,
        average_price: Math.round(Number(order.cprice)) + Math.round((new Date()).getMilliseconds()/100) * 0.05,
        exchange: order.exc,
        order_status: response,
        orderid: orderid,
        price: 0,
        pricetype: "MARKET",
        product: "NRML",
        quantity: Math.abs(order.quantity), //returning positive q as does the openalgo
        filled_q: Math.abs(order.quantity),
        symbol: order.symbol,
        timestamp: order.time + 500,
        trigger_price: 0,
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
    preU,
    preF,
    preD,
    order,
    orderstatus,
    changeSpeed,
    disconnect
  };