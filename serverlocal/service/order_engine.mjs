import qserver from '../quotes.mjs';
import utils from '../../common/utils.mjs';
import adapter from '../adapter/histadapter.mjs';

import EventEmitter from 'node:events';
const wsServer = new EventEmitter();
wsServer.setMaxListeners(1);
wsServer.addListener('message', qserver.emitUpdates);

var listener = false;
const order_map = new Map();

function neworders(orders)
{
    if(!listener)
        adapter.addListener('strikex', orderExecution);

    orders.forEach((order) => {
        
        order_map.set(order.orderid, order);
        order.state = 'opened';
        if(order.mode !== 'live')
            wsServer.emit('message', order.appid, {type: 'order', data: order});
    });
}

function liveOrderMatching(message)
{
    var live_order = message.data;
    var order = order_map.get(live_order.orderid);
    if(order !== undefined)
    {
        order = standardizeO(order);
        order.state = ex_order.state;
        order.time_matched = Date.now();
        wsServer.emit('message', order.appid, {type: 'order', data: order});
    }
    else
    {
        qserver.broadcast({type: 'order', data: order});
    }
}

function orderExecution(q)
{
    listener = true;
    const openorders = order_map.values().toArray().filter((odr) => {
        return (odr.state === 'opened'
        && odr.symbol === q.symbol
        && odr.mode !== 'live');
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

function standardizeO(order)
{
    const {nOrdNo: orderid, ordSt: state, avgPrc: pricedAt, prc: price, prod: product, sym: stockCode,
            expDt: expiry_date, stkPrc: strike_price, optTp: right, trnsTp: action, fldQty: filled_q, unFldSz: unfilled_q,
            qty: quantity, prcTp: pricetype, ...rest} = order;

    var uOrder = {orderid, state, pricedAt, price, product, stockCode, expiry_date, strike_price, right, action,
                        filled_q, unfilled_q, quantity, pricetype, ...rest};
    
    if(uOrder.state === 'open')
        uOrder.state = 'opened';
    
    uOrder.action = uOrder.action === 'B' ? 'BUY' : 'SELL';
    uOrder.expiry_date = uOrder.expiry_date.replaceAll(', 20', '').replaceAll(' ', '').toUpperCase();
    uOrder.strike_price = uOrder.strike_price.replace('.00', '');
    uOrder.symbol = uOrder.stockCode + uOrder.expiry_date +  uOrder.strike_price + uOrder.right;

    return uOrder;
}

function cancelOrder(order)
{
    var found = order_map.get(order.orderid);
    if(found !== undefined) {
        found.state = 'cancelled';
        if(found.mode !== 'live')
            wsServer.emit('message', order.appid, {type: 'order', data: found});
    }
}

function orderbook(appid, stockCode)
{
    const orders = order_map.values().toArray().filter((o) => {
        return (o.appid === appid
        && o.stockCode === stockCode
        && o.mode !== 'live');
    });
    return orders;
}

export default {
    neworders,
    cancelOrder,
    orderbook,
    liveOrderMatching
}