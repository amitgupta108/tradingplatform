import { execFileSync } from 'node:child_process';
import EventEmitter from 'node:events';
const OrderNotifier = new EventEmitter();
OrderNotifier.setMaxListeners(1);

const mode_kotak_live = 1;
const sim_order_map = new Map();
const live_order_map = new Map();
var counter = 50000;

function addOrderUpdateListener(callback)
{
    OrderNotifier.addListener('order', callback);
}

function neworders(orders)
{
    orders.forEach((order) => {
    
        order.filled_q = 0;
        order.pricedAt = 0;
        order.orderid = ++counter;
        if(order.mode === 'live') {
            order.localid = order.orderid;
            live_order_map.set(order.orderid, order);
        } else {
            order.state = 'opened';
            sim_order_map.set(order.orderid, order);
        }

        if(order.mode !== 'live')
            OrderNotifier.emit('order', order.appid, 'order', order);
    });
}

function liveOrderMatching(message, mode)
{
    if(!['open', 'complete', 'rejected', 'cancelled'].includes(message.data.ordSt))
        return;

    /*
        1. externally placed order - no orderid
        2. app triggered order with orderid available
        3. app triggered order with orderid not yet available
    */
    const live_order = formatLiveOrder(message.data, false);
    var found = Array.from(live_order_map.values()).find((order) => {
        return (order.orderid === live_order.orderid)
                || (order.stockCode === live_order.stockCode
                && order.action === live_order.action
                && order.pricetype === live_order.pricetype
                && order.quantity === live_order.quantity
                && order.quantity >= live_order.filled_q
                && order.symbol === live_order.symbol); 
    });

    if(found !== undefined)
    {
        live_order.appid = found.appid;
        if(found.orderid === found.localid) //orderid matched - update existing order
            live_order_map.delete(found.orderid);
    }
    else
        live_order.appid = live_order.stockCode + mode;
    
    console.log('live order matching status: ' + live_order.appid);
    live_order_map.set(live_order.orderid, live_order);

    OrderNotifier.emit('order', live_order.appid, 'order', live_order);
}

function orderExecutionSim(q)
{
    const openorders = Array.from(sim_order_map.values()).filter((order) => {
        return (order.state === 'opened'
            && order.symbol === q.symbol
            && order.mode !== 'live');
    });
    
    if(openorders.length === 0)
        return;

    openorders.forEach((order) => {
        var executed = false;
        if(order.pricetype === 'MARKET')
            executed = true;
        else if(order.pricetype === 'LIMIT')
            if(order.action === 'BUY' && q.ltp <= order.price)
                executed = true;
            else if(order.action === 'SELL' && q.ltp >= order.price)
                executed = true;
        
        if(executed) {
            order.state = 'completed';
            order.pricedAt = q.ltp;
            order.filled_q = order.quantity;
            OrderNotifier.emit('order', order.appid, 'order', order);
        }
    });
}

function formatLiveOrder(order, insert = false)
{
    var {nOrdNo: orderid, ordSt: state, avgPrc: pricedAt, prc: price, prod: product, sym: stockCode, trdSym: symbol, 
            expDt: expiry_date, stkPrc: strike_price, optTp: right, trnsTp: action, fldQty: filled_q, unFldSz: unfilled_q,
            qty: quantity, prcTp: pricetype, strategyCode: _appid, ordSrc: source, ...rest} = order;

    var fOrder = {orderid, state, pricedAt, price, product, stockCode, symbol, expiry_date, strike_price, right, action,
                        filled_q, unfilled_q, quantity, pricetype, _appid, source};
    
    if(fOrder.state === 'open') {
        fOrder.state = 'opened';
        filled_q = 0;
    }
    else if(fOrder.state === 'complete')
        fOrder.state = 'completed';
    
    fOrder.pricetype = fOrder.pricetype === 'L' ? 'LIMIT' : 'MARKET';
    fOrder.action = fOrder.action === 'B' ? 'BUY' : 'SELL';
    fOrder.expiry_date = fOrder.expiry_date.replaceAll(', 20', '').replaceAll(' ', '').toUpperCase();
    fOrder.strike_price = fOrder.strike_price.replace('.00', '');
    fOrder.symbol = fOrder.stockCode + fOrder.expiry_date +  fOrder.strike_price + fOrder.right;
    fOrder.mode = 'live';
    if(insert && !live_order_map.has(fOrder.orderid))
        live_order_map.set(fOrder.orderid, fOrder);

    return fOrder;
}

function cancelOrder(sim_order)
{
    var found = sim_order_map.get(order.orderid);
    if(found !== undefined && found.state === 'opened') {
        found.state = 'cancelled';
        OrderNotifier.emit('order', found.appid, 'order', found);
    }
    else
        console.error('requested order cancellation failed - order not found or not open');
}

function orderbook(appid, stockCode)
{
    return Array.from(sim_order_map.values()).filter((order) => {
        return (order.appid === appid
        && order.stockCode === stockCode
        && order.mode !== 'live');
    });
}

export default {
    neworders,
    cancelOrder,
    orderbook,
    liveOrderMatching,
    addOrderUpdateListener,
    orderExecutionSim,
    formatLiveOrder
}