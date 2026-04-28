import OpenAlgo from 'openalgo';
import qserver from '../quotes.mjs';
import adapter from '../adapter/histadapter.mjs';

const connkey = '14e179c44e80177f203c5301ab933cf46e3fedc8f7124e035a363f1776ec7251';
const client = new OpenAlgo(connkey).connect()
        .then(() => console.log('openalgo client connected'))
        .catch((error) => console.error('Error connecting to openalgo ' + error)
    );
var uid;


function onQuotes(q)
{ 
    qserver.emitQs(uid, standardizeoq(q));
}

function exit(uid)
{
    subscribe(uid, 'unsuball');
}

function standardizeoq(q) 
{
    q.ltp = Number(q.ltp);
    q.ltt = Number(q.ltt);
    q.close = (q.ltp);
    q.open = q.ltp;
    q.high = q.ltp;
    q.low = q.ltp;
    q.exchange = q.exchange === 'NSE_INDEX' ? 'NSE' : q.exchange;
    if (q.symbol.endsWith('PE') || q.symbol.endsWith('CE')) {
        q.right = q.symbol.slice(-2) === 'CE' ? 'Call' : 'Put';

        var strike = q.symbol.slice(-9, -2);
        var digit5 = Number.isFinite(Number(strike));
        q.strike_price = digit5 ? strike.slice(2, 7) : strike.slice(3, 7);
        q.expiry_date = digit5 ? q.symbol.slice(-14, -7) : q.symbol.slice(-13, -6);
        q.stockCode = digit5 ? q.symbol.slice(0, -14) : q.symbol.slice(0, -13);
    }
    return q;
} 

function subscribe(uid, sublist, action)
{
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
            return o.symbol.startsWith(scrip.stockCode);
        });
    }
    return orders;
}

async function order(uid, orders)
{
    var fOrders = formatorder(orders);
    var response;
    if(fOrders.length === 1)
        response = await client.placeOrder(fOrders[0]);
    else if( fOrders.length > 1)
        response = await client.basketOrder({orders: fOrders});
    console.log(JSON.stringify(response));
    return response;
}

function formatorder(orders)
{
    return orders.map((o) => {
        let { cprice, orderN, state, time, stockCode, ...trimmedOrder} = o;
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
export default {order, subscribe, orderbook, cancelorder, exit };
