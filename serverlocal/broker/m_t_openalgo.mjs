import OpenAlgo from 'openalgo';
import streamer from '../stream.mjs';
import ordermanager from '../service/ordermanager.mjs';
import utils from '../../common/utils.mjs';
import qutils from './quotesutils.mjs';
import path from 'path';
import services from '../service/services.mjs';
import { subs_store_all, Subscriptions } from '../session/appstate.mjs';
import { OPT_EXPIRIES } from '../../common/constants.mjs';

const name = path.parse(import.meta.filename).name;
const logical_view_name = 'OPENALGOVIEW';
const logical_trade_name = 'OPENALGOTRADE'

let initialized = false;
let provider_subs;
let client;
let ws_direct;
let reconn_count = 0; 
let counter = 0;
let view_mode;

function onQuotes(q)
{ 
    const qt = qutils.standardizeoq(q);
    const l_appid = qt.stockCode + view_mode;
    streamer.emitQs(l_appid, qt);
    
    const key = qt.exchange === 'MCX' ? 'futures' : 'index';
    if(qt.key === 'strikex')
        qutils.sendQsToSim(view_mode, qt);
    else if(qt.key === key && (counter === 0 || counter++ === 6)) 
    {
        counter = 1;
        const response = qutils.atmRefresh(logical_view_name, l_appid, qt);
        if(response.rebuild) 
        {
            response.list.forEach((ost) => {
                subscribe(l_appid, ost.strikes, 'subs');
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

function startv2(appid, p)
{
    const stock_subs = provider_subs.addNewSubscriptions(p.stockCode + view_mode, p);
    const requests = stock_subs.getSubsItemsByKey(['index', 'futures']);
    const st = requests.find((r) => r.key === 'index');
    if(st !== undefined)
        st.exchange = 'NSE_INDEX';
    
    subscribe(appid, requests, 'subs');
}

function start(appid, sublist) 
{
    subscribe(appid, sublist, 'subs');
}

function autoStart() {
    
    setTimeout(() => {
        const list = subs_store_all[logical_view_name].getFullSubsList();
        for(const [k, v] of list)
        {
            const requests = v.getSubsItemsByKey(['index', 'futures']);
            subscribe(k, requests, 'subs');
            const chains = v.getActiveOptionChains();
            chains.forEach((oc) => {
                subscribe(k, oc.strikes, 'subs');
            });
        }

        ws_direct = client._wsClient.ws;
        ws_direct.addEventListener('close', () => {
            console.log('openalgo websocket reconn count ' + reconn_count);
            autoStart();
        })
    }, 5000);
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
        if(view_mode === undefined)
            view_mode = services.getProviderModeKey(logical_view_name, 'view')?.at(0);
        
        
        if(!client)
            client = new OpenAlgo(process.env.openalgo_key);
        
        provider_subs = new Subscriptions(logical_view_name);

        return client.connect()
        .then(() => {
            initialized = true;
            ws_direct = client._wsClient.ws;
            ws_direct.addEventListener('close', () => {
                console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
                autoStart();
            });
            return {status: 'success'}
        })
        .catch((error) => {throw error;});
    }
}

export default {subscribe, exit, init, start, startv2, neworders, orderbook, cancelorder, name};