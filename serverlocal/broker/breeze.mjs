import adapter from '../adapter/histadapter.mjs';
import Order_Service from '../service/order_engine.mjs';

var counter = 50000;

function init(uid, startTime, speed)
{
    adapter.init(uid, startTime, speed);
}

function exit(uid)
{
    adapter.exit(uid);
}

function subscribe(uid, instruments, action)
{
    adapter.subscribe(uid, instruments, action);
}

function changeSpeed(uid, speed)
{
    adapter.changeSpeed(uid, speed);
}

function orderbook(uid, stockCode)
{
    return Order_Service.orderbook(uid, stockCode);
}

function order(uid, orders)
{
    orders.forEach((order) => {
        var oid = ++counter;
        order.orderid = oid;
        order.filled_q = 0;
    });
    
    Order_Service.neworders(orders);
}

function cancelorder(uid, order)
{
    Order_Service.cancelOrder(order);
}

function preU(p) {
    p.exchange = 'NSE';
    return adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');
}

function preF(uid, stockCode, p) {
    p.expiry = p.fExpiry;
    p.type = "futures";
    p.exchange = 'NFO';
    p.uid = uid;
    p.stockCode = stockCode;
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

export default {
    init,
    exit,
    subscribe,
    preF,
    order,
    orderbook,
    changeSpeed,
    cancelorder
  };