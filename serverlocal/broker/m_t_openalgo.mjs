import OpenAlgo from 'openalgo';
import streamer from '../stream.mjs';
import ordermanager from '../service/ordermanager.mjs';
import qutils from './quotesutils.mjs';
import path from 'path';
import services from '../service/services.mjs';
import { subs_store_all, Subscriptions } from '../session/appstate.mjs';

const name = path.parse(import.meta.filename).name;
const logical_view_name = 'OPENALGOVIEW';
const logical_trade_name = 'OPENALGOTRADE'

let initialized = false;
let client;
let ws_direct;
let my_subs;
let reconn_count = 0; 
let view_mode;

function init() {
    if (!initialized) {
        my_subs = new Subscriptions(logical_view_name);

        if (view_mode === undefined)
            view_mode = services.getProviderModeKey(logical_view_name, 'view')?.at(0);

        if (!client)
            client = new OpenAlgo(process.env.openalgo_key, process.env.openalgo_http, 'v1', process.env.openalgo_ws);

        const p = client.connect();

        return p.then(() => {
            initialized = true;
            ws_direct = client._wsClient.ws;
            ws_direct.addEventListener('close', () => {
                console.log('openalgo websocket state ' + client._wsClient.ws.readyState);
                autoStart();
            });
            return { status: 'success' }
        })
            .catch((error) => {
                client._wsClient.shouldReconnect = false;
                throw error;
            });
    }
}

function startv2(appid, p) {
    const stock_subs = my_subs.addNewSubscriptions(p.stockCode + view_mode, p);
    stock_subs.addListener('ATMChange', onATMChange);
    const requests = stock_subs.getSubsItems(['index', 'futures']);
    const st = requests.find((r) => r.key === 'index');
    if (st !== undefined)
        st.exchange = 'NSE_INDEX';

    subscribe(appid, requests, 'subs');
}

function onQuotes(q)
{ 
    const qt = qutils.standardize(logical_view_name, q);
    const l_appid = qt.stockCode + view_mode;
    streamer.emitQs(l_appid, qt);
    
    if(qt.key === 'strikex')
        qutils.sendQsToSim(view_mode, qt);
    
    const key = qt.exchange === 'MCX' ? 'futures' : 'index';
    if (qt.key === key) {
        setTimeout(() => {
            const stock_subs = my_subs.getSubscriptions(l_appid);
            stock_subs.getNotified('index', qt);
        }, 1000);
    }
}

function exit(appid, sublist)
{
    if(client?._wsClient?.isConnected)
        client?._wsClient?.ws._sendMessage({action: unsubscribe_all});
}

function autoStart() {
    
    setTimeout(() => {
        const list = subs_store_all[logical_view_name].getFullSubsList();
        for(const [k, v] of list)
        {
            const requests = v.getSubsItems(['index', 'futures']);
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

function option_chain(appid, stockCode, expiry, action)
{
    const stock_subs = my_subs.getSubscriptions(stockCode + view_mode);
    const response = stock_subs.optionChainAction(expiry, action);
    if(response !== undefined) {
        subscribe(appid, response.strikes, response.action);
    }
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

function onATMChange(uq) {
    const l_appid = uq.stockCode + view_mode;

    const t = my_subs.getSubscriptions(l_appid);
    const strikesset = t.reloadStrikes(uq);

    strikesset.forEach((s) => {
        subscribe(l_appid, s, 'subs');
    });
}

function onSubs(ost) 
{
    const l_appid = ost.stockCode + view_mode;
    subscribe(l_appid, ost.strikes, 'subs');
}

export default {subscribe, exit, init, startv2, neworders, orderbook, cancelorder, option_chain, name};