import OpenAlgo from 'openalgo';
import qserver from '../quotes.mjs';
import trade_utils from './tradeupdater.mjs';
import adapter from '../adapter/histadapter.mjs';
import live_kotak from './t_kotakneo.mjs';
import Order_Service from '../service/ordersimulator.mjs';

const connkey = '14e179c44e80177f203c5301ab933cf46e3fedc8f7124e035a363f1776ec7251';
const client = new OpenAlgo(connkey);
let streaming_status = false;

const symbol_cache = new Map();

client.connect()
    .then(() => {
        console.log('openalgo client connected');
        client._wsClient.ws.addEventListener('open', () => {
            console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
        });

        client._wsClient.ws.addEventListener('close', () => {
            console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
            streaming_status = false;
        });
    })
    .catch((error) => console.error('Error connecting to openalgo ' + error)
);

const mode_live = 1;

function onQuotes(q)
{ 
    const qt = standardizeoq(q);
    qserver.emitQs(qt.stockCode + mode_live, qt);

    if(qt.key === 'strikex')
        Order_Service.orderExecutionSim(qt);
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
        
    if(symbol_cache.get(q.symbol) === undefined) 
    {
        const regex = /[0-9]/;
        const idx = q.symbol.search(regex);
        const st_code = idx === -1 ? q.symbol : q.symbol.slice(0, idx);

        if (q.symbol.endsWith('PE') || q.symbol.endsWith('CE')) {
            const right = q.symbol.slice(-2) === 'CE' ? 'Call' : 'Put';
            const expiry = q.symbol.slice(idx, idx + 7);
            const strike = q.symbol.slice(idx + 7, -2);
        }
        symbol_cache.set(q.symbol, {stockCode: st_code, right: right, expiry: expiry, strike: strike});
    }

    q.st_code = symbol_cache.get(q.symbol).stockCode;
    if(q.exchange === 'NSE_INDEX') {
        q.exchange = 'NSE';
        q.key = 'index';
    }
    else if (q.symbol.endsWith('FUT')) {
        q.key = 'futures';
    }
    else if (q.symbol.endsWith('PE') || q.symbol.endsWith('CE')) {
        q.key = 'strikex';

        q.right = symbol_cache.get(q.symbol).right;
        q.expiry_date = symbol_cache.get(q.symbol).expiry;
        q.strike_price = symbol_cache.get(q.symbol).strike;
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

    var res = await live_kotak.order(appid, orders);
    console.log('order response ' + JSON.stringify(res));
    return res;

    //const promises = orders.map((order) => live_kotak.placeOrder(appid, order));
    //return await Promise.all(promises);
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

export default {subscribe, exit };