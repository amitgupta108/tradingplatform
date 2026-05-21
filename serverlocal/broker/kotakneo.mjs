import OpenAlgo from 'openalgo';
import qserver from '../quotes.mjs';
import Order_Service from '../service/order_engine.mjs';
import adapter from '../adapter/histadapter.mjs';
import Kotak_Direct from './kotakneo-api.mjs';

const connkey = '14e179c44e80177f203c5301ab933cf46e3fedc8f7124e035a363f1776ec7251';
const client = new OpenAlgo(connkey);
client.connect()
        .then(() => console.log('openalgo client connected'))
        .catch((error) => console.error('Error connecting to openalgo ' + error)
);

var live_order_unlocked = false;
const mode_kotak_live = 1;

function unlockLiveOrders(key)
{
    const today = new Date();
    if(key === today.toDateString())
        live_order_unlocked = true;

    console.log('live order state ' + live_order_unlocked);
    return (key === today.toDateString());
}

function onQuotes(q)
{ 
    const qt = standardizeoq(q);
    qserver.emitQs(qt.stockCode + mode_kotak_live, qt);
}

function exit(appid, sublist)
{
    subscribe(appid, sublist, 'unsub');
}

function standardizeoq(q) 
{
    q.ltp = Number(q.ltp);
    q.ltt = Number(q.ltt);
    q.close = (q.ltp);
    q.open = q.ltp;
    q.high = q.ltp;
    q.low = q.ltp;
    
    const regex = /[0-9]/;
    const idx = q.symbol.search(regex);
    q.stockCode = idx === -1 ? q.symbol : q.symbol.slice(0, idx);

    if(q.exchange === 'NSE_INDEX') {
        q.exchange = 'NSE';
        q.key = 'index';
    }
    else if (q.symbol.endsWith('FUT')) {
        q.key = q.exchange === 'MCX' ? 'index' : 'futures';
    }
    else if (q.symbol.endsWith('PE') || q.symbol.endsWith('CE')) {
        q.right = q.symbol.slice(-2) === 'CE' ? 'Call' : 'Put';
        q.expiry_date = q.symbol.slice(idx, idx + 7);
        q.strike_price = q.symbol.slice(idx + 7, -2);
        q.key = 'strikex';
    }        

    return q;
} 

function subscribe(appid, sublist, action)
{
    if(sublist.length === 0)
        return;

    var redirectedpath = sublist.filter((item) => item.source === 'icici');
    adapter.subscribe(appid, redirectedpath, action);

    var originalpath = sublist.filter((item) => {
        if(item.key === 'index' && item.exchange === 'NSE')
            item.exchange = 'NSE_INDEX';
        return item.source !== 'icici'
    });

    if(action === 'subs')
        client.subscribe_ltp(originalpath, onQuotes);
    else 
        client.unsubscribe_ltp(originalpath, onQuotes);
}

async function orderbook(appid, stockCode)
{
    return await Kotak_Direct.orderbook(appid, stockCode);
}

async function order(appid, orders)
{
    if(!live_order_unlocked)
        return;

    const fOrders = formatorder(orders);
    Order_Service.neworders(orders);

    let response;
    if(fOrders.length === 1)
        response = await client.placeOrder(fOrders[0]);
    else if(fOrders.length > 1)
        response = await client.basketOrder({orders: fOrders});

    const orderids = Array.isArray(response) ? response : [response];
    orderids.forEach((conf, index) => {
            orders[index].state = 'submitted';
            orders[index].orderid = conf.orderid;
            orders[index].status = conf.status;
            console.log('order confirmation ' + JSON.stringify(conf) + ' for order ' + JSON.stringify(orders[index]));
    });

    return response;
}

function formatorder(orders)
{
    return orders.map((o) => {
        let {mode, appid, orderN, state, time, stockCode, ...trimmedOrder} = o;
        trimmedOrder.strategy = o.appid;
        return trimmedOrder;
    });   
}

function cancelorder(appid, order)
{
    const kotakOrder = {orderId: order.orderid ?? order.orderId};
    return client.cancelOrder(kotakOrder)
    .then((resp) => {
        console.log('order cancellation response ' + JSON.stringify(resp));
        Order_Service.cancelOrder(order);
        return resp;
    });
}

export default {order, subscribe, orderbook, cancelorder, exit, unlockLiveOrders };