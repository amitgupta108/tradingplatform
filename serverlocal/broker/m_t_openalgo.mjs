import OpenAlgo from 'openalgo';
import session from '../session/session.mjs';
import streamer from '../stream.mjs';
import ordermanager from '../service/ordermanager.mjs';
import adapter from '../adapter/breezeadapter.mjs';
import utils from '../../common/utils.mjs';
import qutils from './quotesutils.mjs';
import path from 'path';
import services from '../service/services.mjs';
import { subs_cache } from '../session/appstate.mjs';

const name = path.parse(import.meta.filename).name;
const logical_view_name = 'OPENALGOVIEW';
const logical_trade_name = 'OPENALGOTRADE'

let initialized = false;
let subs_lost = true;
let client;
let counter = 0;
let view_mode;

function onQuotes(q)
{ 
    const qt = qutils.standardizeoq(q);
    streamer.emitQs(qt.stockCode + view_mode, qt);

    if(qt.key === 'futures' && (counter === 0 || counter++ === 6)) {
        counter = 1;
        const response = qutils.atmRefresh(logical_view_name, qt);
        if(response.refreshed === true || subs_lost === true) {
            const chains = subs_cache[logical_view_name].getSubscriptions(qt.stockCode).getSubsItembyKey(response.list);
            chains.forEach((oc) => {
                subscribe(qt.stockCode + view_mode, oc.strikes, 'subs');
                subs_lost = false; 
            });
        }
    }
}

function exit(appid, sublist)
{
    //subscribe(appid, sublist, 'unsub');
    if(client?._wsClient?.isConnected)
        client?._wsClient?.ws._sendMessage({action: unsubscribe_all});
}

function start(appid, stockCode)
{
    const provider_subs = subs_cache[logical_view_name];
    const stock_subs = provider_subs.addNewSubscription(stockCode);
    const requests = stock_subs.getRequestsByKey(['index', 'futures']);
    
    subscribe(appid, requests, 'subs');
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

function init()
{
    if(!initialized)
    {
        view_mode = services.getProviderModeKey(logical_view_name, 'view')?.at(0);
        if(!client)
            client = new OpenAlgo(process.env.openalgo_key);
        return client.connect()
        .then(() => {
            initialized = true;
            client._wsClient.ws.addEventListener('close', () => {
                console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
                subs_lost = true;
                autoSubscribe();
            });
            return {status: 'success'}
        })
        .catch((error) => {throw error;});
    }
}

export default {subscribe, exit, init, start, neworders, orderbook, cancelorder, name};