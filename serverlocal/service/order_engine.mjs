import EventEmitter from 'node:events';
const OrderNotifier = new EventEmitter();
OrderNotifier.setMaxListeners(1);

const order_map = new Map();

function addOrderUpdateListener(callback)
{
    OrderNotifier.addListener('order', callback);
}

function neworders(orders)
{
    orders.forEach((order) => {
        
        order.state = 'opened';
        order_map.set(order.orderid, order);
        if(order.mode !== 'live')
            OrderNotifier.emit('order', order.appid, 'order', order);
    });
}

function liveOrderMatching(message)
{
    const live_order = formatLiveOrder(message.data);
    const local_order = order_map.get(live_order.orderid);
    
    if(local_order === undefined)
        neworders([live_order]);
    else 
        live_order.appid = local_order.appid;

        
    if(['completed', 'opened', 'cancelled'].includes(live_order.state))
        OrderNotifier.emit('order', live_order.appid, 'order', live_order);
}

function orderExecutionSim(q)
{
    const openorders = Array.from(order_map.values()).filter((order) => {
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

function formatLiveOrder(order)
{
    var {nOrdNo: orderid, ordSt: state, avgPrc: pricedAt, prc: price, prod: product, sym: stockCode,
            expDt: expiry_date, stkPrc: strike_price, optTp: right, trnsTp: action, fldQty: filled_q, unFldSz: unfilled_q,
            qty: quantity, prcTp: pricetype, ...rest} = order;

    var fOrder = {orderid, state, pricedAt, price, product, stockCode, expiry_date, strike_price, right, action,
                        filled_q, unfilled_q, quantity, pricetype, ...rest};
    
    if(fOrder.state === 'open') {
        fOrder.state = 'opened';
        filled_q = 0;
    }
    else if(fOrder.state === 'complete')
        fOrder.state = 'completed';
    
    fOrder.action = fOrder.action === 'B' ? 'BUY' : 'SELL';
    fOrder.expiry_date = fOrder.expiry_date.replaceAll(', 20', '').replaceAll(' ', '').toUpperCase();
    fOrder.strike_price = fOrder.strike_price.replace('.00', '');
    fOrder.symbol = fOrder.stockCode + fOrder.expiry_date +  fOrder.strike_price + fOrder.right;
    fOrder.mode = 'live';

    return fOrder;
}

function cancelOrder(order)
{
    var found = order_map.get(order.orderid);
    if(found !== undefined && found.state === 'opened') {
        found.state = 'cancelled';
        if(found.mode !== 'live')
            OrderNotifier.emit('order', found.appid, 'order', found);
    }
    else
        console.error('requested order cancellation failed - order not found or not open');
}

function orderbook(appid, stockCode)
{
    return Array.from(order_map.values()).filter((order) => {
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
    orderExecutionSim
}