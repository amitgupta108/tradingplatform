import adapter from '../adapter/histadapter.mjs';
import app from '../app.mjs';
import Order_Service from '../service/ordersimulator.mjs';
import qServer from '../stream.mjs';

let initialized = false;
//const subs_cache = new Map();
const mode_live_icici = 'LIVE_2';
const mode_history_icici = 'HISTORY';

function clientConfigure(appid, startTime, speed)
{
    return adapter.init(appid, startTime, speed);
}

function exit(appid)
{
    return adapter.exit(appid);
}

function subscribe_vix(appid, mode, action)
{
    return adapter.subscribe_vix(appid, mode, action);
}

function start(appid, instruments, mode)
{
    return adapter.start(appid, instruments, mode);
}

function subscribe(appid, instruments, action, mode)
{
    if(action === 'subs')
        if(mode === 'HISTORY')
            adapter.h_subscribe(appid, instruments, action);
        else
            adapter.l_subscribe(appid, instruments, action);
    else
        adapter.l_subscribe(appid, instruments, action)
}

function pause(appid, action) 
{
    return adapter.pause(appid, action);
}

function changeSpeed(appid, speed)
{
    return adapter.changeSpeed(appid, speed);
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
}

function standardizeiq(qt) 
{
    const tStart = process.hrtime.bigint();
    if(typeof qt.ltt === 'string')
        return {key: 'vix', stockCode: qt.stock_code, exchange: qt.exchange_code, ltp: qt.last, ltt: qt.ltt = Date.parse(qt.ltt)};
    

    const {exchange_code: exchange, stock_code: stockCode, product_type, open_interest, volume , datetime, high, low, ...rest} = qt;
    const q = {exchange, stockCode, ...rest};
    
    q['ltp'] = qt['close'];
    if(q.ltt === undefined)
        q.ltt = Date.parse(qt.datetime);

    if(q.stockCode === 'CRUDE')
        q.stockCode = 'CRUDEOIL';
    
    if(q.expiry_date !== undefined)
        q.expiry_date = (q.expiry_date.replaceAll('-20', '').replaceAll('-', '')).toUpperCase();

    if(q.exchange !== 'NSE' && q.strike_price !== undefined) {
        q.key = 'strikex';
        q.right = q.right_type !== undefined ? q.right_type : (q.right === 'Call' ? 'CE' : 'PE');
        q.symbol = q.stockCode + q.expiry_date + q.strike_price + q.right;
    } else if(q.expiry_date !== undefined) {
        q.key = 'futures';
        q.symbol = q.stockCode + q.expiry_date + 'FUT';
    }
    else {
        q.key = q.stockCode.endsWith('VIX') ? 'vix' : 'index';
        q.symbol = q.stockCode;
    }
    const tEnd = process.hrtime.bigint();
    q.tDiff = Number(tEnd - tStart);
    return q;
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
    p.right = "PE";
    var pQ = adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');

    p.strike = Math.round(uq.close / 50 + 3) * 50;
    p.right = "CE";
    var cQ = adapter.getHistoricalQuotes(p, p.startTime, p.endTime, '5minute');

    return [pQ, cQ];
}

function init()
{
    if(!initialized) {
        const status = adapter.addQuoteListener(onQuotes);
        adapter.connect();        
        initialized = true;
    }
}

export default {
    init,
    exit,
    pause,
    subscribe,
    preF,
    preQ,
    changeSpeed,
    subscribe_vix,
    clientConfigure,
    start,
  };