import qserver from '../quotes.mjs';
import utils from '../../common/utils.mjs';

import EventEmitter from 'node:events';
const wsServer = new EventEmitter();
wsServer.setMaxListeners(1);
wsServer.addListener('message', qserver.emitUpdates);

var listener = false;
const order_map = new Map();

function neworders(orders)
{
    if(!listener)
        adapter.addListener('strikex', orderMatching);

    orders.forEach((order) => {
        
        order_map.set(order.orderid, order);
        order.state = 'opened';
        wsServer.emit('message', order.appid, {type: 'order', data: order});
    });
}

function orderMatching(q)
{
    listener = true;
    const openorders = order_map.values().toArray().filter((odr) => {
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
            wsServer.emit('message', o.appid, {type: 'order', data: o});
        }
    });
}

function cancelOrder(order)
{
    var found = order_map.get(order.orderid);
    if(found !== undefined)
        found.state = 'cancelled';

    wsServer.emit('message', order.appid, {type: 'order', data: found});
}

function orderbook(appid, stockCode)
{
    return utils.filter(order_map.values().toArray(), {uid: appid, stockCode: stockCode});
}

export default {
    neworders,
    cancelOrder,
    orderbook
}