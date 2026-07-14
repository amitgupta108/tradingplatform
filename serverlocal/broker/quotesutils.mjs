import utils from '../../common/utils.mjs';
import { OPT_EXPIRIES, STRIKE_SIZE } from '../../common/constants.mjs';
import adapter from '../adapter/breezeadapter.mjs';
import streamer from '../stream.mjs';
import { subs_store_all, Subscriptions } from '../session/appstate.mjs';
import simulator from '../service/ordersimulator.mjs';

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

function expandSymbol(symbol)
{
    let t = symbol_cache.get(symbol);
    if(t !== undefined)
        return t;

    t = utils.expandSymbol(symbol);

    symbol_cache.set(symbol, t);
    return t;
}

function standardizeiq(qt) {
    const tStart = process.hrtime.bigint();

    const { exchange_code: exchange, stock_code: stockCode, product_type, open_interest, volume, datetime, high, low, ...rest } = qt;
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
    const tEnd = process.hrtime.bigint();
    q.tDiff = Number(tEnd - tStart);
    return q;
}

function standardizeoq(quote) 
{
    const q = expandSymbol(quote.symbol); 
    q.ltp = quote.ltp;
    q.ltt = quote.ltt;
    q.close = quote.ltp;
    q.exchange = quote.exchange;
    
    return q;
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
    standardizeiq,
    standardizeoq,
    atmRefresh,
    sendQsToSim,
    buildRequests
  };