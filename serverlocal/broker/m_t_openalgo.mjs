import OpenAlgo from 'openalgo';
import qserver from '../stream.mjs';
import ordermanager from '../service/ordermanager.mjs';
import utils from '../../common/utils.mjs';

import {opt_expiries, live_atm, strike_size} from '../../common/constants.mjs';

let initialized = false;
const client = new OpenAlgo(process.env.openalgo_key);

const symbol_cache = new Map();
const subs_cache = new Map();
const regex = /[0-9]/;
const openalgo_mode_live = 'LIVE';

function onQuotes(q)
{ 
    const qt = standardizeoq(q);
    qserver.emitQs(qt.stockCode + openalgo_mode_live, qt);
    //if(qt.key === 'futures')
        //setImmediate(() => update_atm(qt));    
}

function update_atm(qt)
{
    const key = qt.stockCode + 'occrnt';
    const val = subs_cache.get(key);
    const sz = strike_size[qt.stockCode];
    const oExpiry = opt_expiries[qt.stockCode]['first'];
    const atm = live_atm[qt.stockCode];

    if(atm === 0)
    {
        const strikes = utils._strikes(qt.ltp, oExpiry.startIdx, oExpiry.endIndex, sz);
        const list = strikes.map((s) => {
                var symbol = qt.stockCode + oExpiry.date + s.strike + s.right;
                return {exchange: qt.exchange, symbol: symbol};
            });    
        subscribe(undefined, list, 'subs');
        live_atm[qt.stockCode] = Math.round(qt.ltp / sz) * sz;
        val.strikes = list;
    }
    else if(Math.abs(atm - qt.ltp) > sz)
    {
        const offset = Math.round(atm - qt.ltp) / sz;
        const addn_skprices = Math.sign(offset) > 0 ? atm + (oExpiry.endIdx + 1) * sz : atm + (oExpiry.startIdx - 1) * sz;
        const ce_strike = qt.stockCode + oExpiry.date + addn_skprices + 'CE';
        const pe_strike = qt.stockCode + oExpiry.date + addn_skprices + 'PE';
        subscribe(undefined, [{exchange: qt.exchange, symbol: ce_strike}, {exchange: qt.exchange, symbol: pe_strike}], 'subs');
        live_atm[qt.stockCode] = Math.round(qt.ltp / sz) * sz;
        val.strikes.concat([{exchange: qt.exchange, symbol: ce_strike}, {exchange: qt.exchange, symbol: pe_strike}]);
    }
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

function start(appid, sublist)
{
    sublist.forEach((st) => {
        if(st.exchange === 'NSE')
            st.exchange = 'NSE_INDEX';
        const key = st.stockCode + st.key;
        if(subs_cache.get(key) === undefined)
            subs_cache.set(key, st);
    }); 
    subscribe(appid, sublist, 'subs');
}

function subscribe(appid, list, action)
{
    if(list.length === 0)
        return;

    if(action === 'subs')
        client.subscribe_ltp(list, onQuotes);
    else 
        client.unsubscribe_ltp(list, onQuotes);
}

function buildSubsList(sublist){
    sublist.forEach((st) => {
        if(st.key === 'occrnt') {
            const expiry = utils.opt_expiries['first'];
            st.utils_strikes();
        }
    });
}

async function orderbook(appid, stockCode)
{
    var response = await client.orderbook();
    if(response.status === 'success')
        return response.data.orders.flatMap(o => 
                o.symbol.startsWith(stockCode) ? [formatOutOrder(o)] : []);
}

function formatOutOrder(order) {
    let { price: pricedAt, triggerPrice: tPrice, quantity: filled_q = 0, order_status: state, ...rest } = order;
    let fOrder = { pricedAt, tPrice, filled_q, state, ...rest };

    fOrder.mode = 'live';
    fOrder.state = fOrder.state === 'open' ? 'opened' : fOrder.state === 'complete' ? 'completed' : fOrder.state;

    return fOrder;
}

async function neworders(appid, view_mode, message)
{
    const promises = message.orders.map((order) => placeOrder(appid, order));
    return await Promise.all(promises);
}

async function placeOrder(appid, order)
{
    const clone = formatInOrder(order);
    ordermanager.neworders(appid, [order]);

    let response = await client.placeOrder(clone);
    if(order.state === 'created') {
        order.state = 'submitted';
        order.orderid = response.orderid;
        order.status = response.status;
    };
    console.log('order confirmation ' + JSON.stringify(response) + ' for order ' + JSON.stringify(order));
    return response;
}

function formatInOrder(order)
{
    let {mode, appid, orderN, state, time, stockCode, ...trimmedOrder} = order;
    return trimmedOrder;
}

function cancelorder(order)
{
    client.cancelOrder({orderId: order.orderid})
    .then((resp) => {
        console.log('order cancellation response ' + JSON.stringify(resp));
        //Order_Service.cancelOrder(order);
    });
}

function init()
{
    if(!initialized)
    {
        client.connect()
        .then(() => {
            initialized = true;
            console.log('openalgo client connected');
            /*console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
            var list = Array.from(subs_cache.values());
            if(list.length > 0)
                client.subscribe_ltp(list, onQuotes);

            client._wsClient.ws.addEventListener('error', (reason) => {
                console.log('openalgo websocket error: ' + reason);
            
            });
            client._wsClient.ws.addEventListener('close', () => {
                console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
                //qserver.streaming_status(false, 'openalgo', openalgo_mode_live);
            });

            const atm_timer = setInterval(() => {
                updateStrikes();
            }, 10000)*/
            
        }).catch((error) => console.error('Error connecting to openalgo ' + error));
    }
}

export default {subscribe, exit, init, start, neworders, orderbook, cancelorder};