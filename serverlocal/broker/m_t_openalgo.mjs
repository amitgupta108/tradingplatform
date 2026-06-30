import OpenAlgo from 'openalgo';
import session from '../session/session.mjs';
import streamer from '../stream.mjs';
import ordermanager from '../service/ordermanager.mjs';
import adapter from '../adapter/breezeadapter.mjs';
import utils from '../../common/utils.mjs';
import qutils from './quotesutils.mjs';
import path from 'path';

const name = path.parse(import.meta.filename).name;
let initialized = false;
const client = new OpenAlgo(process.env.openalgo_key);
let counter = 0;
const openalgo_mode_live = 'LIVE';

function onQuotes(q)
{ 
    const qt = qutils.standardizeoq(q);
    streamer.emitQs(qt.stockCode + openalgo_mode_live, qt);
    if(qt.key === 'futures' && (counter === 0 || counter++ === 6)) {
        counter = 1;
        const requests = qutils.atmRefresh(qt, 'FIRST');
        subscribe(qt.stockCode + openalgo_mode_live, requests, 'subs');
    }
}

function exit(appid, sublist)
{
    //subscribe(appid, sublist, 'unsub');
    if(client?._wsClient?.isConnected)
        client?._wsClient?.ws._sendMessage({action: unsubscribe_all});
}

function start(appid, sublist)
{
    qutils.addToCache(sublist);
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

function autoSubscribe()
{
    setTimeout(() => {
        const entries = qutils.getCachedLists();
        entries.forEach((v, k) => {
            streamer.streaming_status(k);
            subscribe(undefined, v, 'subs');
        })
    }, 5000);
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
    });
}

function subscribe_vix(appid, mode, action) {
    return adapter.subscribe_vix(appid, mode, action);
}

function history(p) {
    return adapter.getHistory(p);
}

function init()
{
    if(!initialized)
    {
        return client.connect()
        .then(() => {
            initialized = true;
            client._wsClient.ws.addEventListener('close', () => {
                console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
                autoSubscribe();
            });
            return {status: 'success'}
        })
        .catch((error) => {throw error;});
    }
}

export default {subscribe, exit, init, start, neworders, orderbook, cancelorder, subscribe_vix, history, name};