import kotak_socket from './tradeupdater.mjs';
import Order_Service from '../service/ordersimulator.mjs';

function authHeaders()
{
    const auth_data = kotak_socket.getAuthData();
    return {
        'Authorization': '3ed099c0-1a60-4a65-b24f-8c42747ecffa',
        'neo-fin-key': 'neotradeapi',
        'sid': auth_data.sid,
        'Auth': auth_data.token,
        'Content-Type': 'application/x-www-form-urlencoded',
        'accept': 'application/json'
    };
}

function apiUrl(path)
{
    const auth_data = kotak_socket.getAuthData();
    return new URL(`${path}`, auth_data.baseUrl).href;
}

async function request(path, options)
{
    const url = apiUrl(path);
    return await fetch(url, options);
}

async function post(path, body, urlEncoded = true)
{
    const requestBody = urlEncoded
        ? new URLSearchParams({ jData: JSON.stringify(body) }).toString()
        : JSON.stringify(body);

    return await request(path, {
        method: 'POST',
        headers: authHeaders(),
        body: requestBody
    });
}

async function get(path, urlEncoded = true)
{
    var response = await request(path, {
        method: 'GET',
        headers: authHeaders(urlEncoded)
    });
    return await response.json();
}

function normalizeOrderType(type)
{
    const pt = String(type ?? '').toUpperCase();
    if(pt === 'LIMIT') return 'L';
    if(pt === 'MARKET' || pt === 'MKT') return 'MKT';
    if(pt === 'SL-M' || pt === 'SLM') return 'SL-M';
    if(pt === 'SL') return 'SL';
    return pt;
}

function mapExchangeSegment(exchange, symbol)
{
    const exc = String(exchange ?? '').toUpperCase();
    const ts = String(symbol ?? '').toUpperCase();

    if(exc.includes('MCX')) return 'mcx_fo';
    if(exc.includes('CDE')) return 'cde_fo';
    if(exc.includes('BSE') && /FUT|CE|PE/.test(ts)) return 'bse_fo';
    if(exc.includes('BSE')) return 'bse_cm';
    if(/FUT|CE|PE/.test(ts)) return 'nse_fo';
    return 'nse_cm';
}

function toStringValue(value, fallback = '')
{
    return value === undefined || value === null ? fallback : String(value);
}

function toKotakOrder(order)
{
    const action = order.action === 'BUY' || order.action === 'B' ? 'B'
                 : order.action === 'SELL' || order.action === 'S' ? 'S'
                 : String(order.action ?? '').toUpperCase();
    const orderType = normalizeOrderType(order.pricetype || order.orderType || 'LIMIT');
    const symbol = order.symbol || order.ts || order.stockCode || '';
    const product = String(order.product || 'NRML').toUpperCase();
    const quantity = Number(order.quantity ?? order.qty ?? 0);
    const price = Number(order.price ?? order.pr ?? order.lmtprice ?? 0);
    const trigger = Number(order.tp ?? order.triggerPrice ?? order.trigger ?? 0);

    const kotakOrder = {
        am: toStringValue(order.am, 'NO'),
        dq: toStringValue(order.dq ?? order.disclosedQuantity, '0'),
        es: mapExchangeSegment(order.exchange || order.es || order.segment, symbol),
        mp: toStringValue(order.mp, '0'),
        pc: product,
        pf: 'N',
        pr: orderType === 'MKT' || orderType === 'SL-M' ? '0' : String(price),
        pt: orderType,
        qt: String(quantity),
        rt: String(order.validity || order.rt || 'DAY'),
        tp: String(trigger),
        ts: symbol,
        tt: action,
    };

    if(product === 'BO' || product === 'CO') {
        kotakOrder.sot = toStringValue(order.sot, '');
        kotakOrder.slt = toStringValue(order.slt, '');
        kotakOrder.slv = toStringValue(order.slv, '');
        kotakOrder.sov = toStringValue(order.sov, '');
        kotakOrder.tlt = toStringValue(order.tlt, 'N');
        kotakOrder.tsv = toStringValue(order.tsv, '0');
        kotakOrder.lat = toStringValue(order.lat, 'LTP');
    }

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
    const fOrders = orders.map(toKotakOrder);
    if(fOrders.length === 0)
        return null;

    Order_Service.neworders(orders);

    let response;
    if(fOrders.length === 1)
        response = await post('order/placeOrder', fOrders[0], true);
    else
        response = await post('order/basketOrder', {orders: fOrders}, true);

    if(response === undefined || response === null)
        return response;

    const orderids = Array.isArray(response) ? response : [response];
    orderids.forEach((conf, index) => {
        if(orders[index].orderid === undefined) {
            orders[index].orderid = conf.nOrdNo ?? conf.orderid ?? conf.orderId;
            orders[index].status = conf.stat ?? conf.status;
        }
    });

    return response;
}

async function modifyorder(appid, order)
{
    const kotakOrder = toKotakModifyOrder(order);
    return await post('order/modifyOrder', kotakOrder, true);
}

async function cancelorder(appid, order)
{
    const resp = await post('quick/order/cancel', {on: order.orderid}, true);
    console.log('cancel response ' + JSON.stringify(resp) + ' for order ' + JSON.stringify(order));
    return resp;
}

async function orderbook(appid, stockCode)
{
    const response =  await get('quick/user/orders', false);
    const orders = response.data.map((order) => {
        return Order_Service.formatLiveOrder(order, true);
    }).filter((order) => {
        return order.stockCode === stockCode;
    });

    return orders.sort((a, b) => a.orderid - b.orderid);
}

export default {
    cancelorder,
    orderbook
};
