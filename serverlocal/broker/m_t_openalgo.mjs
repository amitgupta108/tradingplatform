import OpenAlgo from 'openalgo';
import qserver from '../quotes.mjs';
import trade_utils from './tradeupdater.mjs';
import adapter from '../adapter/histadapter.mjs';
import live_kotak from './t_kotakneo.mjs';

const connkey = '14e179c44e80177f203c5301ab933cf46e3fedc8f7124e035a363f1776ec7251';
const client = new OpenAlgo(connkey);

client.connect()
    .then(() => {
        console.log('openalgo client connected');
        client._wsClient.ws.addEventListener('open', () => {
            console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
        });
    })
    .catch((error) => console.error('Error connecting to openalgo ' + error)
);

const mode_kotak_live = 1;

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
    return await live_kotak.orderbook(appid, stockCode);
}

async function order(appid, orders)
{
    const promises = orders.map((order) => live_kotak.placeOrder(appid, order));
    return await Promise.all(promises);
}

async function placeOrder(appid, order)
{
    const clone = structuredClone(order);
    trade_utils.neworders(appid, [order]);

    let response = await client.placeOrder(clone);
    if(order.state === 'created') {
        order.state = 'submitted';
        order.orderid = response.orderid;
        order.status = response.status;
    };
    console.log('order confirmation ' + JSON.stringify(response) + ' for order ' + JSON.stringify(order));
    return response;
}

async function basketorder(appid, orders)
{
    trade_utils.neworders(appid, orders);

    let response = await client.basketOrder({orders: orders});

    response.forEach((conf, index) => {
            orders[index].state = 'submitted';
            orders[index].orderid = conf.orderid;
            orders[index].status = conf.status;
            console.log('order confirmation ' + JSON.stringify(conf) + ' for order ' + JSON.stringify(orders[index]));
    });

    return response;
}

async function cancelorder(appid, order)
{
    return await live_kotak.cancelorder(appid, order);
}

export default {order, basketorder, subscribe, orderbook, cancelorder, exit };