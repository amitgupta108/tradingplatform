import adapter from '../adapter/histadapter.mjs';
import Order_Service from '../service/ordersimulator.mjs';
import qServer from '../stream.mjs';

let initialized = false;
const mode_live_icici = 3;

function clientConfigure(appid, startTime, speed)
{
    adapter.init(appid, startTime, speed);
}

function exit(appid)
{
    adapter.exit(appid);
}

function subscribe_vix(appid, action)
{
    adapter.subscribe_vix(action);
}

function subscribe(appid, instruments, action)
{
    adapter.subscribe(appid, instruments, action);
}

function changeSpeed(appid, speed)
{
    adapter.changeSpeed(appid, speed);
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
        qServer.emitQs(q.stockCode + mode_live_icici, q);

    if(q.key === 'strikex')
        Order_Service.orderExecutionSim(q);
}

function standardizeiq(q) 
{
    q['exchange'] = q['exchange_code'];
    q['stockCode'] = q['stock_code'];

    q['ltp'] = q['close'];
    if(q.ltt === undefined)
        q.ltt = Date.parse(q.datetime);

    if(q.stockCode === 'CRUDE')
        q.stockCode = 'CRUDEOIL';
    
    if(q.expiry_date !== undefined)
        q.expiry_date = (q.expiry_date.replaceAll('-20', '').replaceAll('-', '')).toUpperCase();

    if(q.exchange !== 'NSE' && q.strike_price !== undefined) {
        q.key = 'strikex';
        const rt = q.right_type !== undefined ? q.right_type : (q.right === 'Call' ? 'CE' : 'PE');
        q.symbol = q.stockCode + q.expiry_date + q.strike_price + rt;
    } else if(q.expiry_date !== undefined) {
        q.key = 'futures';
        q.symbol = q.stockCode + q.expiry_date + 'FUT';
    }
    else {
        q.key = q.stockCode.endsWith('VIX') ? 'vix' : 'index';
        q.symbol = q.stockCode;
    }
    
    let {exchange_code, stock_code, product_type, open_interest, volume , datetime, ...trimmedquote} = q;

    return trimmedquote;
}

function preQ(key, p) {
    if(p.exchange === 'MCX')
        return null;

    p.exchange = key === 'index' || key === 'vix' ? 'NSE' : 'NFO';
    p.stockCode = key === 'vix' ? 'INDVIX' : p.stockCode;
    p.expiry = p.fExpiry;

    return adapter.getHistoricalQuotes(p);
}

function preF(appid, stockCode, p) {
    p.expiry = p.fExpiry;
    p.type = "futures";
    p.exchange = 'NFO';
    p.appid = appid;
    p.stockCode = stockCode;
    return adapter.getHistoricalQuotes(p);
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

function init()
{
    if(!initialized) {
        adapter.addQuoteListener(onQuotes);
        const sessionid = process.env.breeze_sid;
        adapter.connect(sessionid, true);
        initialized = true;
    }
}

export default {
    init,
    exit,
    subscribe,
    preF,
    preQ,
    changeSpeed,
    subscribe_vix,
    clientConfigure
  };