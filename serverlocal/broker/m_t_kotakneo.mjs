import scrip_service from '../service/scripstore.mjs';
import kotak_socket from '../service/connectionmanager.mjs';
import ordermanager from '../service/ordermanager.mjs';
import qserver from '../stream.mjs';

var paths;
var initialized = false;

function init()
{
    if(!initialized)
    {
        initialized = true;
    }
    return initialized;
}

function notifyme(connected)
{
    if(connected) {
        paths = {
            order: apiUrl('quick/order/rule/ms/place'),
            orderbook: apiUrl('quick/user/orders'),
            cancel: apiUrl('quick/order/cancel')
        };
    }
}

function authHeaders()
{
    const auth_data = kotak_socket.getSavedCredentials();
    return {headers: {
        'accept': 'application/json',
        'Sid': auth_data.hsi_sid,
        'Auth': auth_data.hsi_token,
        'neo-fin-key': 'neotradeapi',
        'Content-Type': 'application/x-www-form-urlencoded'
    }, baseUrl: auth_data.baseUrl};
}

function apiUrl(path)
{
    const auth_data = authHeaders();
    return new URL(`${path}`, auth_data.baseUrl).href;
}

async function request(path, options)
{
    const url = paths[path];
    console.log('order submitted');
    return await fetch(url, options);
}

async function post(path, body)
{
    const requestBody = new URLSearchParams({ jData: JSON.stringify(body) });

    return await request(path, {
        method: 'POST',
        headers: authHeaders().headers,
        body: requestBody.toString()
    });
}

async function get(path)
{
    var response = await request(path, {
        method: 'GET',
        headers: authHeaders().headers
    });
    return await response.json();
}

function toKotakOrder(order, isKotakOrder)
{    
    const ts = order.exchange === 'NFO' ? order.symbol.slice(0, -2) + '.00' + order.symbol.slice(-2): order.symbol; 
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
    //console.log('order confirmation ' + JSON.stringify(status) + ' for order ' + JSON.stringify(order));
    return status;
}

async function modifyorder(appid, order)
{
    const kotakOrder = toKotakModifyOrder(order);
    return await post('order/modifyOrder', kotakOrder, true);
}

async function cancelorder(appid, order)
{
    const response = await post('cancel', {on: order.orderid});
    if(!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }
    console.log('cancel response ' + JSON.stringify(response) + ' for order ' + JSON.stringify(order));
    return response.json();
}

async function orderbook(appid, stockCode)
{
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
        kotak_socket.subscribe(type, subs_string);
    else 
        kotak_socket.unsubscribe(type, subs_string);       
}

function onQuotes(q)
{ 
    console.log('hsm quotes ' + JSON.stringify(q));
    /*const qt = standardizeoq(q);
    qserver.emitQs(qt.stockCode + mode_live, qt);

    if(qt.key === 'strikex')
        Order_Service.orderExecutionSim(qt);
    */
}

function exit(appid, sublist)
{
    subscribe(appid, sublist, 'unsub');
}

export default {
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
