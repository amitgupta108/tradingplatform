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
const scrip_to_app_map = new Map();
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
    const appid = scrip_to_app_map.get(qt.stockCode).appid;
    qserver.emitQs(appid, qt);
}

function exit(uid, sublist)
{
    subscribe(uid, sublist, 'unsub');
}

function standardizeoq(q) 
{
    q.ltp = Number(q.ltp);
    q.ltt = Number(q.ltt);
    q.close = (q.ltp);
    q.open = q.ltp;
    q.high = q.ltp;
    q.low = q.ltp;
    if(q.exchange === 'NSE_INDEX')
        q.exchange = 'NSE';

    const regex = /[0-9]/;
    const idx = q.symbol.search(regex);
    q.stockCode = idx === -1 ? q.symbol : q.symbol.slice(0, idx);

    if (q.symbol.endsWith('PE') || q.symbol.endsWith('CE')) {
        q.right = q.symbol.slice(-2) === 'CE' ? 'Call' : 'Put';
        q.expiry_date = q.symbol.slice(idx, idx + 7);
        q.strike_price = q.symbol.slice(idx + 7, -2);
    }
    return q;
} 

function subscribe(uid, sublist, action)
{
    if(sublist.length === 0)
        return;

    scrip_to_app_map.set(sublist.at(0).stockCode, {uid: uid, appid: uid});

    var originalpath = sublist.filter((item) => item.source !== 'icicilive');
    if(action === 'subs')
        client.subscribe_ltp(originalpath, onQuotes);
    else 
        client.unsubscribe_ltp(originalpath, onQuotes);
    
    var redirectedpath = sublist.filter((item) => item.source === 'icicilive');
    adapter.wsLive(uid, redirectedpath, action);
}

async function orderbook(uid, scrip)
{
    var response = await client.orderbook();
    if(response.status === 'success')
    {
        var orders = response.data.orders.filter((o) => {
            o.state = o.order_status;
            if(o.order_status === 'open')
                o.state = 'opened';
            return o.symbol.startsWith(scrip.stockCode);
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
        fOrders[0].orderid = response.orderid;
        Order_Service.neworders(fOrders);
    }
    else if( fOrders.length > 1) {
        response = await client.basketOrder({orders: fOrders});
        response.forEach((r, idx) => {
            fOrders[idx].orderid = r.orderid;
        })
        if(fOrders.length === response.length)
            Order_Service.neworders(fOrders);
        else 
            console.error('Missing orders from submission');
    }
    console.log(JSON.stringify(response));

    return response;
}

function formatorder(orders)
{
    return orders.map((o) => {
        let { orderN, state, time, stockCode, ...trimmedOrder} = o;
        return trimmedOrder;
    });   
}

function cancelorder(order)
{
    client.cancelOrder({orderId: order.orderid})
    .then((resp) => {
        console.log('order cancellation response ' + JSON.stringify(resp));
    });
}
export default {order, subscribe, orderbook, cancelorder, exit, unlockLiveOrders };
