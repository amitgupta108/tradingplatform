const adapter = require('../adapter/histadapter');
const ordersocket = require('./broker/brokeerws');
const utils = require('../../common/utils')

require('console-stamp')(console, '[HH:MM:ss.l]');

var orderid = 50000;
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

function orderBook(uid, stockCode)
{
    return utils.filter(orders.values().toArray(), {uid: uid, stockCode: stockCode});
}

function order(uid, order)
{
    order.uid = uid;
    orders.set(++orderid, order);

    var tid = setTimeout(() => {
        orderstatus(uid, orderid);
    }, 150);
}

function basketOrder(uid, orders)
{
    orders.array.forEach((o) => {
        order(uid, o);
    });
}

function orderstatus(uid, orderid)
{
    var order = orders.get(orderid);

    order.average_price = Math.round(Number(order.cprice)) + Math.round((new Date()).getMilliseconds()/100) * 0.05;
    order.status = Date.now() % 20 === 0 ? 'rejected' : 'complete';
    order.filled_q = order.status === 'rejected' ? 0: Math.abs(order.quantity);
    order.timestamp = order.time + 150;
    order.order_status = order.status; //same field name as in openalgo

    var response = ordersocket.wsOpsSim(uid, 'isAlive', undefined); 
    if(response.data === 'live');
        ordersocket.onmessage({type: 'order', data: order});
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
    orderBook,
    changeSpeed,
    disconnect
  };