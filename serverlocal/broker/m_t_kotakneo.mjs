import scrip_service from '../service/scripstore.mjs';
import ordermanager from '../service/ordermanager.mjs';
import qserver from '../stream.mjs';
import socketclient from '../service/socketclient.mjs';
import connector  from '../service/kotak/connector.os.mjs';
import path from 'path';

const name = path.parse(import.meta.filename).name;
let paths;

var initialized = false;

function init() {
    if (!initialized) {
        console.log('connection initiated');
        return socketclient.hsiconnect()
            .then((response) => {
                console.log('kotak neo init ' + response.status)
            });
    }
}

function notifyme(connected)
{
    if(connected){
        paths = {
            order: '/quick/order/rule/ms/place',
            orderbook: '/quick/user/orders',
            cancel: '/quick/order/cancel'
        };
        initialized = true;
        console.log('HSI connected');
    }
}

function getAuthData()
{
    const auth_data = connector.getCredentials();
    return {headers: {
        'accept': 'application/json',
        'Sid': auth_data.hsi_sid,
        'Auth': auth_data.hsi_token,
        'neo-fin-key': 'neotradeapi',
        'Content-Type': 'application/x-www-form-urlencoded'
    }, baseUrl: auth_data.baseUrl};
}

function apiUrl(url)
{
    const baseUrl = getAuthData().baseUrl;
    return new URL(url, baseUrl).href;
}

async function submit(path, options)
{
    const url = apiUrl(paths[path]);
    return await fetch(url, options);
}

async function post(path, body)
{
    const requestBody = new URLSearchParams({ jData: JSON.stringify(body) });

    const response = submit(path, {
        method: 'POST',
        headers: getAuthData().headers,
        body: requestBody.toString()
    });
    console.log('order just submitted ' + requestBody);
    return (await response).json();
}

async function get(path)
{
    var response = await submit(path, {
        method: 'GET',
        headers: getAuthData().headers
    });
    return await response.json();
}

function toKotakOrder(order, isKotakOrder)
{    
    const key = order.exchange === 'NFO' ? order.symbol.slice(0, -2) + '.00' + order.symbol.slice(-2) : order.symbol;
    const ts = scrip_service.findScripByKey('scripReferenceKey', key).tradingSymbol;
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

function toKotakModifyOrder(order)
{
    const kotakOrder = toKotakOrder(order);
    kotakOrder.nOrdNo = order.orderid ?? order.orderId;
    return kotakOrder;
}

function neworders(appid, view_mode, orders)
{
    if (!initialized) {
        return { status: 'error', reason: 'service not connected' };
    }
    const promises = orders.map((order) => placeOrder(appid, order));
    return Promise.all(promises);
}

async function placeOrder(appid, order)
{
    const clone = toKotakOrder(order);
    if(clone.ts === undefined)
        return 'trading symbol not found ' + order.symbol;
    
    ordermanager.neworders(appid, [order]);
    let response = await post('order', clone);
    console.log('order submission return ' + JSON.stringify(clone));
    if(!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    const status = await response.json();
    if(order.state === 'created') {
        order.state = 'submitted';
        order.orderid = status.nOrdNo;
        order.status = status.stat;
        order.stCode = status.stCode;
        order.error = status.emsg;
    };
    return status;
}

async function modifyorder(appid, order)
{
    const kotakOrder = toKotakModifyOrder(order);
    return await post('order/modifyOrder', kotakOrder, true);
}

async function cancelorder(appid, order)
{
    if (!initialized) {
        return { status: 'error', reason: 'service not connected' };
    }
    const response = await post('cancel', {on: order.orderid});
    if(!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }
    console.log('cancel response ' + JSON.stringify(response) + ' for order ' + JSON.stringify(order));
    return response.json();
}

async function orderbook(appid, stockCode)
{
    if(!initialized) {
        return {status: 'error', reason: 'service not connected'};
    }
    const response =  await get('orderbook');
    const orders = response?.data.map((order) => {
        return ordermanager.formatLiveOrder(order, true);
    }).filter((order) => {
        return order.stockCode === stockCode;
    });

    return orders?.sort((a, b) => a.orderid - b.orderid);
}

function subscribe(appid, sublist, action)
{
    if(sublist.length === 0)
        return;

    var subs_string = '';
    for(var item of sublist) {
        if(item.key === 'strikex'){
            var key = 'scripreferenceKey';
            var value = item.symbol.slice(0, -2);
            value += item.symbol.endsWith('PE') ? '.00PE' : '.00CE';
            var type = 'mws'
        }
        else {
            var key = 'tradingSymbol';
            var value = item.symbol;
            var type = item.key === 'index' ? 'ifs' : 'mws';
        }
        var instrument = scrip_service.findScripByKey(key, value);
        subs_string = (subs_string !== '' ? subs_string + '&' : '') + `${instrument.exchangeSegment}|${instrument.symbol}`;
    }

    if(action === 'subs')
        socketclient.subscribe(type, subs_string);
    else 
        socketclient.unsubscribe(type, subs_string);       
}

function exit(appid, sublist)
{
    subscribe(appid, sublist, 'unsub');
}

export default {
    name,
    neworders,
    cancelorder,
    orderbook,
    placeOrder,
    modifyorder,
    exit,
    subscribe,
    init,
    notifyme
};
