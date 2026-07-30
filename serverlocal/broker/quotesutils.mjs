import scrip_service from '../service/scripstore.mjs';
import utils from '../../common/utils.mjs';
import { OPT_EXPIRIES, STRIKE_SIZE } from '../../common/constants.mjs';
import { subs_store_all, Subscriptions } from '../session/appstate.mjs';
import simulator from '../service/ordersimulator.mjs';
import { parse } from 'date-fns';

const pattern = "dd/MM/yyyy HH:mm:ss";
const symbol_cache = new Map();

function atmRefresh(provider, appid, uq) 
{    
    const provider_subs = subs_store_all[provider]; 
    const t = provider_subs.getSubscriptions(appid);
    const atm = t.getPreviousATM('FIRST');

    if (Math.abs(atm - uq.ltp) > STRIKE_SIZE[uq.stockCode])
    {
        const osts = t.getActiveOptionChains();
        osts.forEach((ost) => {
            t.buildOptionChain(uq, ost);
        });
        return {rebuild: true, list: osts}
    }  
    return {rebuild: false, list: []};
}

function completeQ(q)
{
    q.close = q.ltp;
    if(q.ltt === undefined)
        q.ltt = q.last_traded_time * 1000;
    
    let scrip = symbol_cache.get(q.symbol);
    if(scrip !== undefined)
        return { ...q, ...scrip};

    scrip = utils.expandSymbol(q.symbol);

    symbol_cache.set(q.symbol, scrip);
    return { ...q, ...scrip };
}

function standardize(name, q)
{
    switch (name) {
        case 'ICICILIVEVIEW': 
            return standardizeiq(q) 
        case 'ICICIHISTVIEW':
            return standardizeiq(q) 
        case 'OPENALGOVIEW':
            return standardizeoq(q) 
        case 'KOTAKHSMVIEW':
            return standardizekq(q) 
    }
}

function standardizeiq(qt) {

    const { exchange_code: exchange, stock_code: stockCode, product_type, open_interest, volume, high, low, ...rest } = qt;
    const q = { exchange, stockCode, ...rest };

    q['ltp'] = qt['close'];
    if (q.ltt === undefined)
        q.ltt = Date.parse(qt.datetime);

    if (q.stockCode === 'CRUDE')
        q.stockCode = 'CRUDEOIL';

    if (q.expiry_date !== undefined)
        q.expiry_date = (q.expiry_date.replaceAll('-20', '').replaceAll('-', '')).toUpperCase();

    if (q.exchange !== 'NSE' && q.strike_price !== undefined) {
        q.key = 'strikex';
        q.right = q.right_type !== undefined ? q.right_type : (q.right === 'Call' ? 'CE' : 'PE');
        q.symbol = q.stockCode + q.expiry_date + q.strike_price + q.right;
    } else if (q.expiry_date !== undefined) {
        q.key = 'futures';
        q.symbol = q.stockCode + q.expiry_date + 'FUT';
    }
    else {
        q.key = q.stockCode.endsWith('VIX') ? 'vix' : 'index';
        q.symbol = q.stockCode;
    }
    return q;
}

function standardizeoq(quote) 
{
    return completeQ(quote); 
}

function standardizekq(quote)
{
    let q;
    if (quote.name === 'sf' && quote.ltp !== undefined) {
        const { name: quotetype, tk: token, e: exchange, ts: symbol, ltp, ltt, v: volume, ...rest } = quote;
        q = { quotetype, token, exchange, symbol, ltp, ltt, volume };
    }
    else if (quote.name === 'if' && quote.iv !== undefined) {
        const { name: quotetype, tk: token, e: exchange, iv: ltp, tvalue: ltt, iv: close, ...rest } = quote;
        q = { quotetype, token, exchange, ltp, ltt };
    }
    q.exchange = q.exchange === 'mcx_fo' ? 'MCX' : q.exchange === 'nse_fo' ? 'NFO' : 'NSE';
    q.ltp = Number(q.ltp);
    q.ltt = parse(q.ltt, pattern, new Date()).getTime();
    
    return { ...q, ...tokenToScrip(q.token) };
}

function tokenToScrip(token)
{
    let s = symbol_cache.get('k' + token);
    if(s !== undefined)
        return s;

    const scrip = scrip_service.findScripByKey('symbol', token);
    const {underlying: stockCode, scripReferenceKey: symbol, tradingSymbol: ts, ...rest } = scrip;
    s = {stockCode, symbol, ts};
    if(s.symbol === undefined || s.symbol === '')
        s.symbol = s.ts;

    s.key = s.symbol.endsWith('FUT') ? 'futures' : s.symbol.endsWith('PE') || s.symbol.endsWith('CE') ? 'strikex' : 'index';
    
    s = {...s, ...utils.expandSymbol(s.symbol)};
    symbol_cache.set('k' + token, s);
    return s;
}

function sendQsToSim(view_mode, q)
{
    if(simulator.open_orders[view_mode])
        simulator.orderExecutionSim(view_mode, q);
}

function buildRequests(appid, instruments) {
    return instruments.map((inst) => {
        return {
            appid: appid,
            symbol: inst.symbol,
            instrument: inst
        }
    });
}

export default {
    standardize,
    atmRefresh,
    sendQsToSim,
    buildRequests
  };