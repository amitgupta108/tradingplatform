import utils from '../../common/utils.mjs';
import { OPT_EXPIRIES, STRIKE_SIZE } from '../../common/constants.mjs';
import { subs_store_all, Subscriptions, state_qutils } from '../session/appstate.mjs';
import simulator from '../service/ordersimulator.mjs';
import { parse } from 'date-fns';

const pattern = "dd/MM/yyyy HH:mm:ss";
const symbol_cache = new Map();

/*
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
*/
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
    q.app_entry = Date.now();
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
    const qt = state_qutils.quote_cache.get('k' + quote.tk);
    if(qt === undefined)
        return {ltp: 0, ltt: 0};

    if(quote.ltp !== undefined){
        qt.ltp = Number(quote.ltp);
        qt.ltt = quote.app_entry - qt.offset;
        qt.app_entry = quote.app_entry;
        return qt;
    }
}

function toScrip(quote)
{
    const qt = state_qutils.quote_cache.get('k' + quote.tk);
    if (qt === undefined)
    {
        const offset = Date.now() - parse(quote.fdtm, pattern, new Date()).getTime();
        const { tk: token, e: exchange, ts: symbol, ltp: ltp_feedstart, c: close_ystrd, fdtm, ltt, ...rest } = quote;
        const qt = { token, exchange, symbol, ltp_feedstart, close_ystrd, fdtm, ltt};

        qt.symbol = quote.ts.replaceAll('.00', '');
        qt.exchange = quote.e === 'mcx_fo' ? 'MCX' : quote.e === 'nse_fo' ? 'NFO' : 'NSE';
        qt.key = quote.ts.endsWith('FUT') ? 'futures' : quote.ts.endsWith('PE') || quote.ts.endsWith('CE') ? 'strikex' : 'index';
        qt.offset = offset;
        state_qutils.quote_cache.set('k' + quote.tk, { ...qt, ...utils.expandSymbol(quote.ts) });
    }
    return state_qutils.quote_cache.get('k' + quote.tk);
}

function sendQsToSim(view_mode, q)
{
    if(simulator.open_orders[view_mode])
        simulator.orderExecutionSim(view_mode, q);
}

function buildRequests(appid, instruments) 
{
    const requests = [];    
    instruments.forEach((inst) => {
        const mcx_index = inst.key === 'index' && inst.exchange === 'MCX'; 
        if(!mcx_index)
            requests.push({ appid: appid, symbol: inst.symbol, instrument: inst});
    });

    return requests;
}

export default {
    standardize,
    sendQsToSim,
    buildRequests,
    toScrip
  };