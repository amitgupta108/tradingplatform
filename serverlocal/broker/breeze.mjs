import utils from '../../common/utils.mjs';
import qserver from '../quotes.mjs';
import adapter from '../adapter/histadapter.mjs';

import EventEmitter from 'node:events';
const wsServer = new EventEmitter();
wsServer.setMaxListeners(1);
wsServer.addListener('message', qserver.emitUpdates);

var listener = false;

var counter = 50000;
var ordermap = new Map();

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
    return utils.filter(ordermap.values().toArray(), {uid: uid, stockCode: stockCode});
}

function order(uid, orders)
{
    if(!listener)
        adapter.addListener('strikex', orderMatching);

    orders.forEach((order) => {
        var oid = ++counter;
        order.orderid = oid;
        order.uid = uid;
        order.appid = uid;
        
        ordermap.set(oid, order);
        order.state = 'opened';

        wsServer.emit('message', uid, {type: 'order', data: order});
    });
}

function cancelorder(uid, order)
{
    var found = ordermap.get(order.orderid);
    if(found !== undefined)
        found.state = 'cancelled';

    wsServer.emit('message', uid, {type: 'order', data: found});
}

function orderMatching(q)
{
    listener = true;
    const openorders = ordermap.values().toArray().filter((odr) => {
        return (odr.state === 'opened'
        && odr.symbol === q.symbol);
    });
    
    openorders.forEach((o) => {
        var executed = false;
        if(o.pricetype === 'MARKET')
            executed = true;
        else if(o.pricetype === 'LIMIT')
            if(o.action === 'BUY' && q.close <= o.price)
                executed = true;
            else if(o.action === 'SELL' && q.close >= o.price)
                executed = true;
        
        if(executed) {
            o.state = 'completed';
            o.pricedAt = q.close;
            o.filled_q = o.quantity;
            wsServer.emit('message', o.uid, {type: 'order', data: o});
        }
    });
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
    orderMatching,
    cancelorder
  };