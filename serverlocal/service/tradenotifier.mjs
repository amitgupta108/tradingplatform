import qs from '../stream.mjs';
const live_order_map = new Map();
var counter = 10000;

function neworders(appid, orders)
{
    orders.forEach((order) => {
    
        order.filled_q = 0;
        order.pricedAt = 0;
        order.orderid = ++counter;
        order.localid = order.orderid;
        order.appid = appid;
        order.state = 'created';
        live_order_map.set(order.orderid, order);
    });
}

function notifyme(message)
{    
    console.log("message: " + JSON.stringify(message));
    if(message.type === 'order') {
        liveOrderMatching(message, 1);
    }
}

function liveOrderMatching(message, mode)
{
    if(!['open', 'complete', 'rejected', 'cancelled'].includes(message.data.ordSt))
        return;
    console.log('live order update received ' + JSON.stringify(message.data));
    /*
        1. externally placed order - no orderid
        2. app triggered order with orderid available
        3. app triggered order with orderid not yet available
    */
    const live_order = formatLiveOrder(message.data);
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
        live_order_map.delete(found.localid);
    }
    else
        live_order.appid = live_order.stockCode + mode;
    
    console.log('live order matching status: ' + live_order.appid);
    live_order_map.set(live_order.orderid, live_order);

    qs.emitOrders(live_order.appid, 'order', live_order);
}

function formatLiveOrder(order)
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

    return fOrder;
}

export default { notifyme, neworders, formatLiveOrder };