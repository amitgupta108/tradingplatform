import adapter from '../adapter/histadapter.mjs';
import Order_Service from '../service/order_engine.mjs';
import qServer from '../quotes.mjs';

const mode_icici_live = 2;
var counter = 50000;
adapter.addQuoteListener(onQuotes);

function init(appid, startTime, speed)
{
    adapter.init(appid, startTime, speed);
}

function exit(appid)
{
    adapter.exit(appid);
}

function subscribe(appid, instruments, action)
{
    adapter.subscribe(appid, instruments, action);
}

function changeSpeed(appid, speed)
{
    adapter.changeSpeed(appid, speed);
}

function orderbook(appid, stockCode)
{
    return Order_Service.orderbook(appid, stockCode);
}

function order(appid, orders)
{
    orders.forEach((order) => {
        var oid = ++counter;
        order.orderid = oid;
        order.filled_q = 0;
    });
    
    Order_Service.neworders(orders);
}

function cancelorder(appid, order)
{
    Order_Service.cancelOrder(order);
}

function onQuotes(q, mode, appid)
{
    var q = standardizeiq(q);
    if(q.key === 'vix' && mode === 'live') {
        qServer.broadcast('vix', q, 'all_nse_live');
        return;
    }

    if(appid !== undefined)
        qServer.emitQs(appid, q);
    else
        qServer.emitQs(q.stockCode + mode_icici_live, q);

    if(q.key === 'strikex')
        Order_Service.orderExecutionSim(q);
}

function standardizeiq(q) 
{
    q['exchange'] = q['exchange_code'];
    q['ltp'] = q['close'];
    q.ltt = Date.parse(q.datetime);

    if(q.exchange != 'NSE')
        q.expiry_date = q.expiry_date.replaceAll('-20', '').replaceAll('-', '');

    if(q.product_type === 'Futures') {
        q.key = 'futures';
        q.symbol = q.stock_code + q.expiry_date + 'FUT';
    }
    else if(q.product_type === 'Options'){
        q.key = 'strikex';
        q.symbol = q.stock_code + q.expiry_date + q.strike_price + (q.right === 'Call' ? 'CE' : 'PE');
    }
    else {
        q.key = q.stock_code.endsWith('VIX') ? 'vix' : 'index';
        q.symbol = q.stock_code;
    }
    
    let {exchange_code, product_type, open_interest, volume , datetime, ...trimmedquote} = q;

    return trimmedquote;
}

function preU(p) {
    p.exchange = 'NSE';
    return adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');
}

function preF(appid, stockCode, p) {
    p.expiry = p.fExpiry;
    p.type = "futures";
    p.exchange = 'NFO';
    p.appid = appid;
    p.stockCode = stockCode;
    return adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');;
}

function preD(p, uq) {
    p.type = "options";
    p.expiry = p.oExpiry;

    p.strike = Math.round(uq.close / 50 - 3) * 50;
    p.right = "Put";
    var pQ = adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');

    p.strike = Math.round(uq.close / 50 + 3) * 50;
    p.right = "Call";
    var cQ = adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');

    return [pQ, cQ];
}

export default {
    init,
    exit,
    subscribe,
    preF,
    order,
    orderbook,
    changeSpeed,
    cancelorder
  };