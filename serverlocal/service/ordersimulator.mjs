import qServer from '../stream.mjs';
import services from './services.mjs';
import path from 'path';

const name = path.parse(import.meta.filename).name;

const sim_order_map = new Map();
var counter = 50000;
let initialized = false;

const open_orders = {
    HISTORY: false,
    LIVE: false,
    LIVE_2: false
};

function init()
{
    if(!initialized) {
        initialized = true;
        return {status:'success'}
    }
}

function neworders(appid, view_mode, orders)
{
    services.getProfile(appid);
    orders.forEach((order) => {
        order.filled_q = 0;
        order.pricedAt = 0;
        order.orderid = ++counter;
        order.state = 'opened';
        order.view_mode = view_mode;
        sim_order_map.set(order.orderid, order);

        qServer.emitOrders(order.appid, 'order', order);
        open_orders[view_mode] = true;
    });
    return {status: 'success'};
}

function orderExecutionSim(view_mode, q)
{
    const openorders = Array.from(sim_order_map.values()).filter((order) => {
        return (order.state === 'opened'
            && order.symbol === q.symbol
            && order.view_mode === view_mode);
    });
    
    if(openorders.length !== 0)
    {
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
    open_orders[view_mode] = openorders.length > 0 ? true : false;
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
        return order.appid === appid;
    });
}

export default {
    name,
    open_orders,
    neworders,
    cancelOrder,
    orderbook,
    orderExecutionSim,
    init
}