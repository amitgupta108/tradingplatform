import OpenAlgo from 'openalgo';
import qserver from '../quotes.mjs';
import Order_Service from '../service/order_engine.mjs';
import adapter from '../adapter/histadapter.mjs';

const connkey = '14e179c44e80177f203c5301ab933cf46e3fedc8f7124e035a363f1776ec7251';
const client = new OpenAlgo(connkey);
client.connect()
        .then(() => console.log('openalgo client connected'))
        .catch((error) => console.error('Error connecting to openalgo ' + error)
    );

var live_order_unlocked = false;

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
    qserver.broadcast('quote', qt);
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
    var response = await client.orderbook();
    if(response.status === 'success')
    {
        var orders = response.data.orders.filter((o) => {
            o.state = o.order_status;
            if(o.order_status === 'open')
                o.state = 'opened';
            return o.symbol.startsWith(stockCode);
        });
    }
    return orders;
}

async function order(appid, orders)
{
    if(!live_order_unlocked)
        return;

    var fOrders = formatorder(orders);
    
    var response;
    if(fOrders.length === 1) {
        response = await client.placeOrder(fOrders[0]);
        orders[0].orderid = response.orderid;
        Order_Service.neworders(orders);
    }
    else if( fOrders.length > 1) {
        response = await client.basketOrder({orders: fOrders});
        response.forEach((r, idx) => {
            orders[idx].orderid = r.orderid;
        })
        if(orders.length === response.length)
            Order_Service.neworders(orders);
        else 
            console.error('Missing orders from submission');
    }
    console.log('Live order response ' + JSON.stringify(response));

    return response;
}

function formatorder(orders)
{
    return orders.map((o) => {
        let {mode, appid, orderN, state, time, stockCode, ...trimmedOrder} = o;
        return trimmedOrder;
    });   
}

function cancelorder(order)
{
    client.cancelOrder({orderId: order.orderid})
    .then((resp) => {
        console.log('order cancellation response ' + JSON.stringify(resp));
        Order_Service.cancelOrder(order);
    });
}

export default {order, subscribe, orderbook, cancelorder, exit, unlockLiveOrders };