import scripstore from '../service/scripstore.mjs';
import kotak_socket from '../service/livetradenotifier.mjs';
import trade_utils from './tradeupdater.mjs';

function authHeaders()
{
    const auth_data = kotak_socket.getAuthData();
    return {
        'Authorization': '3ed099c0-1a60-4a65-b24f-8c42747ecffa',
        'neo-fin-key': 'neotradeapi',
        'sid': auth_data.sid,
        'Auth': auth_data.token,
        'baseUrl': auth_data.baseUrl,
        'Content-Type': 'application/x-www-form-urlencoded',
        'accept': 'application/json'
    };
}

function apiUrl(path)
{
    const auth_data = authHeaders();
    return new URL(`${path}`, auth_data.baseUrl).href;
}

async function request(path, options)
{
    const url = apiUrl(path);
    return await fetch(url, options);
}

async function post(path, body)
{
    const requestBody = new URLSearchParams({ jData: JSON.stringify(body) }).toString();

    return await request(path, {
        method: 'POST',
        headers: authHeaders(),
        body: requestBody
    });
}

async function get(path)
{
    var response = await request(path, {
        method: 'GET',
        headers: authHeaders()
    });
    return await response.json();
}

function toKotakOrder(order)
{    
    const kotakOrder = {
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
        ts: scriptstore.findScripByKey('scripReferenceKey', symbol).tradingSymbol,
        tt: order.action === 'BUY' ? 'B' : 'S'
    };

    return kotakOrder;
}

function toKotakModifyOrder(order)
{
    const kotakOrder = toKotakOrder(order);
    kotakOrder.nOrdNo = order.orderid ?? order.orderId;
    return kotakOrder;
}

async function order(appid, orders)
{
    const promises = orders.map((order) => placeOrder(appid, order));
    return await Promise.all(promises);
}

async function placeOrder(appid, order)
{
    const clone = toKotakOrder(order);
    trade_utils.neworders(appid, [order]);

    let response = await post('quick/order/rule/ms/place', clone);
    if(order.state === 'created') {
        order.state = 'submitted';
        order.orderid = response.orderid;
        order.status = response.status;
    };
    console.log('order confirmation ' + JSON.stringify(response) + ' for order ' + JSON.stringify(order));
    return response;
}

async function modifyorder(appid, order)
{
    const kotakOrder = toKotakModifyOrder(order);
    return await post('order/modifyOrder', kotakOrder, true);
}

async function cancelorder(appid, order)
{
    const resp = await post('quick/order/cancel', {on: order.orderid});
    console.log('cancel response ' + JSON.stringify(resp) + ' for order ' + JSON.stringify(order));
    return resp;
}

async function orderbook(appid, stockCode)
{
    const response =  await get('quick/user/orders');
    const orders = response.data.map((order) => {
        return trade_utils.formatLiveOrder(order, true);
    }).filter((order) => {
        return order.stockCode === stockCode;
    });

    return orders.sort((a, b) => a.orderid - b.orderid);
}

export default {
    order,
    cancelorder,
    orderbook
};
