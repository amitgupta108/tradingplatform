import scrip_service from '../service/scripstore.mjs';
import ordermanager from '../service/ordermanager.mjs';
import socketclient from '../service/socketclient.mjs';
import { state_kotakneo as mystate } from '../session/appstate.mjs';

import path from 'path';

const name = path.parse(import.meta.filename).name;
var initialized = false;

async function init() {
    if (!initialized) {
        mystate.authData = await socketclient.getSavedCredentials();
        if (mystate.authData !== undefined) {
            initialized = true;
            cache_url();
        }

        return { status: initialized ? 'success' : 'authData not found' };
    }
    return { status: 'already initialized' };
}

function notifyme(authData) {
    mystate.authData = authData;
    cache_url();
    initialized = true;
}

function cache_url() 
{
    const baseUrl = mystate.authData.baseUrl;
    mystate.endpoints.order = new URL('/quick/order/rule/ms/place', baseUrl).href;
    mystate.endpoints.orderbook = new URL('/quick/user/orders', baseUrl).href;
    mystate.endpoints.cancel = new URL('/quick/order/cancel', baseUrl).href;
}

function getHeaders()
{
    const auth_data = mystate.authData;
    return {
        'accept': 'application/json',
        'Sid': auth_data.hsi_sid,
        'Auth': auth_data.hsi_token,
        'neo-fin-key': 'neotradeapi',
        'Content-Type': 'application/x-www-form-urlencoded'
    };
}

function post(endpt, body)
{
    const requestBody = new URLSearchParams({ jData: JSON.stringify(body) });
    const headers = getHeaders();
    const api_url = mystate.endpoints[endpt];
    const options = {
        method: 'POST',
        headers: headers,
        body: requestBody.toString()
    };
    return fetch(api_url, options);
}

function get(endpt)
{
    const headers = getHeaders();
    const api_url = mystate.endpoints[endpt];
    const options = {
        method: 'GET',
        headers: headers
    }
    return fetch(api_url, options);
}

async function placeOrder(appid, order)
{
    const korder = toKotakOrder(order); 
    const response = await post('order', korder);
    ordermanager.neworders(appid, [order]);
    if (response.ok) 
    {
        const result = (await response.json());
        if (result.stat === 'Ok') {
            order.state = 'submitted';
            order.orderid = result.nOrdNo;
        }
        else {
            order.state = 'failed';
            order.stCode = result.stCode;
            order.error = result.emsg;
        }
        return order;
    }
    return { state: 'NOT_OK', emsg: response.errMsg };
}

function toKotakOrder(order) {
    let ts = order.symbol;
    if (order.exchange === 'NFO') {
        const key = order.symbol.slice(0, -2) + '.00' + order.symbol.slice(-2);
        ts = scrip_service.findScripByKey('scripReferenceKey', key).tradingSymbol;
    }
    const new_order = mystate.oTemplate;
    
    new_order.es = order.exchange === 'NFO' ? 'nse_fo' : 'mcx_fo';
    new_order.pc = order.product;
    new_order.pr = String(order.price);
    new_order.pt = order.pricetype === 'MARKET' ? 'MKT' : 'L';
    new_order.qt = String(order.quantity);
    new_order.tt = order.action === 'BUY' ? 'B' : 'S';
    new_order.ts = ts;
    
    return new_order;
}

async function cancelorder(appid, order)
{
    const response = await post('cancel', {on: order.orderid});
    if (response.ok) 
        return (await response.json());
    
    return { stat: 'NOT_OK', emsg: response.errMsg };
}

async function orderbook(appid, stockCode)
{
    const response = await get('orderbook');
    if (response.ok) 
    {
        const orders = (await response.json()).data;

        return orders.map((order) => ordermanager.formatLiveOrder(order, true))
            .filter((order) => order.stockCode === stockCode)
            .sort((a, b) => a.orderid - b.orderid);
    }
    return { status: response.errMsg };
}

function exit(appid, sublist)
{
    subscribe(appid, sublist, 'unsub');
}

export default {
    name,
    placeOrder,
    cancelorder,
    orderbook,
    exit,
    init,
    notifyme
};
