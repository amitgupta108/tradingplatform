const adapter = require('../adapter/histadapter');
const utils = require('../../common/utils')
const qserver = require('../quotes');
const EventEmitter = require('node:events');
const wsServer = new EventEmitter();

require('console-stamp')(console, '[HH:MM:ss.l]');

var counter = 50000;
var ordermap = new Map();

function connect(uid, time)
{
    adapter.connect(uid, time);
    wsServer.addListener('message', (message) => {
        qserver.emitUpdates(uid, message);
    });
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
    return utils.filter(ordermap.values().toArray(), {uid: uid, stockCode: stockCode});
}

function order(uid, orders)
{
    orders.forEach((order) => {
        var oid = ++counter;
        order.orderid = oid;
        order.uid = uid;
        order.appid = uid;
        
        ordermap.set(oid, order);
        order.state = 'opened';

        orderstatus(uid, order.orderid);
    });
}

function orderstatus(uid, orderid)
{
    var order = ordermap.get(orderid);

    order.pricedAt = Math.round(Number(order.cprice)) + Math.round((new Date()).getMilliseconds()/100) * 0.05;
    order.state = Date.now() % 20 === 0 ? 'rejected' : 'complete';
    order.filled_q = order.state === 'rejected' ? 0: Math.abs(order.quantity);

    setTimeout((o) => {
        wsServer.emit('message', {type: 'order', data: o});
    }, 150, order);
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

/*
function validateWS(appid, key){
    if(key === 'sessionkey')
        wscnmap.get(appid).state = 'validated';
    
    wsServer.addListener('message', (mEvent) => {
        if(mEvent.data.order.appid === appid)
            wscnmap.get(appid).callback(mEvent);
        else 
            console.log('possible appid mismatch');
    });

    return wscnmap.get(appid).state;
}
*/
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