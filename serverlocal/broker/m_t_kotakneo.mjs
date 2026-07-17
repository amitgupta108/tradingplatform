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
        if (mystate.authData !== undefined)
            initialized = true;

        return { status: initialized ? 'success' : 'authData not found' };
    }
    return { status: 'already initialized' };
}

function notifyme(authData) {
    initialized = true;
    mystate.authData = authData;
}

function getHeaders() {
    const auth_data = mystate.authData;
    const headers = {
        'accept': 'application/json',
        'Sid': auth_data.hsi_sid,
        'Auth': auth_data.hsi_token,
        'neo-fin-key': 'neotradeapi',
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    return { headers: headers, baseUrl: auth_data.baseUrl };
}

function post(endpt, body) {
    const requestBody = new URLSearchParams({ jData: JSON.stringify(body) });
    const cred = getHeaders();
    const headers = cred.headers;
    const baseUrl = cred.baseUrl;
    const api_url = new URL(endpoints[endpt], baseUrl).href;
    const options = {
        method: 'POST',
        headers: headers,
        body: requestBody.toString()
    };

    const response = fetch(api_url, options);
    console.log('order just submitted');

    return response;
}

async function get(endpt) {
    const cred = await getHeaders();
    const headers = cred.headers;
    const baseUrl = cred.baseUrl;
    const api_url = new URL(endpoints[endpt], baseUrl).href;
    var options = {
        method: 'GET',
        headers: headers
    }
    const response = fetch(api_url, options);
    return (await response).json();
}

function neworders(appid, orders) {
    const responses = [orders.length];
    orders.forEach((order, i) => {
        responses[i] = post('order', toKotakOrder(order));
    });
    ordermanager.neworders(appid, orders);

    return handleOrderResponse(orders, responses);
}

function handleOrderResponse(orders, responses) {
    orders.forEach(async (order, i) => {
        const response = await responses[i];

        if (response.stat === 'Ok') {
            if (order.state === 'created') {
                order.state = 'submitted';
                order.orderid = response.nOrdNo;
                order.status = response.stat;
                order.stCode = response.stCode;
                order.error = response.emsg;
            }
        }
    });
}

function toKotakOrder(order) {
    let ts = order.symbol;
    if (order.exchange === 'NFO') {
        const key = order.symbol.slice(0, -2) + '.00' + order.symbol.slice(-2);
        ts = scrip_service.findScripByKey('scripReferenceKey', key).tradingSymbol;
    }

    return {
        am: 'NO',
        dq: '0',
        es: order.exchange === 'NFO' ? 'nse_fo' : 'mcx_fo',
        mp: '6',
        pc: order.product,
        pf: 'N',
        pr: String(order.price),
        pt: order.pricetype === 'MARKET' ? 'MKT' : 'L',
        qt: String(order.quantity),
        rt: 'DAY',
        tp: '0',
        ts: ts,
        tt: order.action === 'BUY' ? 'B' : 'S'
    };
}

async function cancelorder(appid, order) {
    if (!initialized) {
        return { status: 'error', reason: 'service not connected' };
    }
    const response = await post('cancel', { on: order.orderid });
    if (response.stat !== 'Ok') {
        return { status: response.errMsg };
    }
    console.log('cancel response ' + JSON.stringify(response) + ' for order ' + JSON.stringify(order));
    return response.json();
}

async function orderbook(appid, stockCode) {
    if (!initialized) {
        return { status: 'error', reason: 'service not connected' };
    }
    const response = await get('orderbook');
    if (response.stat !== 'Ok') {
        return { status: response.errMsg };
    }
    const orders = response?.data.map((order) => {
        return ordermanager.formatLiveOrder(order, true);
    }).filter((order) => {
        return order.stockCode === stockCode;
    });

    return orders?.sort((a, b) => a.orderid - b.orderid);
}

function exit(appid, sublist) {
    subscribe(appid, sublist, 'unsub');
}

export default {
    name,
    neworders,
    cancelorder,
    orderbook,
    exit,
    init,
    notifyme
};
