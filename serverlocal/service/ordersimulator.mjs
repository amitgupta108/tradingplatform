import qServer from '../stream.mjs';
const sim_order_map = new Map();
var counter = 50000;
let initialized = false;

function init()
{
    initialized = true;
}

function neworders(appid, orders)
{
    orders.forEach((order) => {
        order.filled_q = 0;
        order.pricedAt = 0;
        order.orderid = ++counter;
        order.state = 'opened';
        sim_order_map.set(order.orderid, order);

        qServer.emitOrders(order.appid, 'order', order);
    });
}

function orderExecutionSim(q)
{
    const openorders = Array.from(sim_order_map.values()).filter((order) => {
        return (order.state === 'opened'
            && order.symbol === q.symbol);
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
            qServer.emitOrders(order.appid, 'order', order);
        }
    });
}

function cancelOrder(appid, sim_order)
{
    var found = sim_order_map.get(sim_order.orderid);
    if(found !== undefined && found.state === 'opened') {
        found.state = 'cancelled';
        qServer.emitOrders(found.appid, 'order', found);
    }
    else
        console.error('requested order cancellation failed - order not found or not open');
}

function orderbook(appid, stockCode)
{
    return Array.from(sim_order_map.values()).filter((order) => {
        return order.appid === appid
    });
}

export default {
    neworders,
    cancelOrder,
    orderbook,
    orderExecutionSim,
    init
}