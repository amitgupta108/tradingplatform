import OpenAlgo from 'openalgo';
import qserver from '../stream.mjs';
import live_kotak from './m_t_kotakneo.mjs';

let initialized = false;
const client = new OpenAlgo(process.env.openalgo_key);

const symbol_cache = new Map();
const subs_cache = new Map();
const regex = /[0-9]/;
const openalgo_mode_live = 1;

function onQuotes(q)
{ 
    const qt = standardizeoq(q);
    qserver.emitQs(qt.stockCode + openalgo_mode_live, qt);
}

function exit(appid, sublist)
{
    //subscribe(appid, sublist, 'unsub');
    client._wsClient.ws._sendMessage({action: unsubscribe_all});
}

function standardizeoq(q) 
{
    q.ltp = Number(q.ltp);
    q.ltt = Number(q.ltt);
    q.close = (q.ltp);
    q.open = q.ltp;
    //q.high = q.ltp;
    //q.low = q.ltp;
    
    const idx = q.symbol.search(regex);
    const st_code = idx === -1 ? q.symbol : q.symbol.slice(0, idx);
    q.stockCode = st_code;
    q.key = q.symbol.endsWith('FUT') ? 'futures' : q.symbol.endsWith('PE') || q.symbol.endsWith('CE') ? 'strikex' : 'index';
    
    if(idx === -1)
        return q;

    const cached = addtocache(q.symbol, idx);
    q.expiry_date = cached.expiry;        
    q.right = cached.right;
    q.strike_price = cached.strike;

    return q;
} 

function addtocache(symbol, idx)
{
    if(symbol_cache.has(symbol))
        return symbol_cache.get(symbol);
    
    const expiry = symbol.slice(idx, idx + 7);
    const cached = {expiry: expiry};

    if(!symbol.endsWith('FUT'))
    {
        cached.strike = symbol.slice(idx + 7, -2);
        cached.right = symbol.slice(-2);
    }
    symbol_cache.set(symbol, cached);
    return cached;
}

function subscribe(appid, sublist, action)
{
    if(sublist.length === 0)
        return;

    const list = sublist.map((item) => {
        if(item.exchange === 'NSE')
            item.exchange= 'NSE_INDEX';
            if(action === 'subs')
                subs_cache.set(item.symbol, {exchange: item.exchange, symbol: item.symbol});
            else
                subs_cache.delete(item.symbol);

        return {exchange: item.exchange, symbol: item.symbol};
    });

    if(action === 'subs')
        client.subscribe_ltp(list, onQuotes);
    else 
        client.unsubscribe_ltp(list, onQuotes);
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

function init()
{
    if(!initialized)
    {
        client.connect()
        .then(() => {
            console.log('openalgo client connected');
            client._wsClient.ws.addEventListener('open', () => {
                console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
                var list = Array.from(subs_cache.values());
                client.subscribe_ltp(list, onQuotes);
            });

            client._wsClient.ws.addEventListener('close', () => {
                console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
                qserver.streaming_status(false, 'openalgo', openalgo_mode_live);
            });
            initialized = true;
        }).catch((error) => console.error('Error connecting to openalgo ' + error));
    }
}
export default {subscribe, exit, init};