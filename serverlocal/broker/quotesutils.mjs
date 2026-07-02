import utils from '../../common/utils.mjs';
import { OPT_EXPIRIES, STRIKE_SIZE } from '../../common/constants.mjs';
import adapter from '../adapter/breezeadapter.mjs';
import streamer from '../stream.mjs';

const live_atm = {
    NIFTY: 0,
    CRUDEOIL: 0,
    BANKNIFTY: 0
};
const regex = /[0-9]/;
const symbol_cache = new Map();
const subs_cache = new Map();

function atmRefresh(uq, expiryN) 
{
    const sz = STRIKE_SIZE[uq.stockCode];
    const atm = live_atm[uq.stockCode];
    const oExpiry = OPT_EXPIRIES[uq.stockCode][expiryN];
    let requests = subs_cache.get(uq.stockCode + oExpiry.date);
 
    if (Math.abs(atm - uq.ltp) > sz) {

        const strikes = utils._strikes(uq.ltp, oExpiry.startIdx, oExpiry.endIdx, sz);
        requests = strikes.map((s) => {
            var symbol = uq.stockCode + oExpiry.date + s.strike + s.right;
            return { exchange: uq.exchange, symbol: symbol };
        });
        subs_cache.set(uq.stockCode + oExpiry.date, requests);        
        live_atm[uq.stockCode] = Math.round(uq.ltp / sz) * sz;

        return {refreshed: true, list: requests};
    }
    return { refreshed: false, list: requests };
}

function addToCache(requests) 
{
    requests.forEach((request) => {
        if (request.exchange === 'NSE')
            request.exchange = 'NSE_INDEX';

        const key = request.stockCode + request.key;
        if (subs_cache.get(key) === undefined)
            subs_cache.set(key, [request]);
    });
}

function getCachedLists(){
    return subs_cache.entries();
}

function expandSymbol(symbol)
{
    let t = symbol_cache.get(symbol);
    if(t !== undefined)
        return t;

    t = {} //template
    const idx = symbol.search(regex);
    const st_code = idx === -1 ? symbol : symbol.slice(0, idx);
    t.stockCode = st_code;
    t.symbol = symbol;
    t.key = symbol.endsWith('FUT') ? 'futures' : symbol.endsWith('PE') || symbol.endsWith('CE') ? 'strikex' : 'index';
    
    if(idx !== -1){
        t.expiry_date = symbol.slice(idx, idx + 7);
        if (!symbol.endsWith('FUT')) {
            t.strike_price = symbol.slice(idx + 7, -2);
            t.right = symbol.slice(-2);
        }
    }

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

function standardizeoq(quote) {
    
    const q = expandSymbol(quote.symbol); 
    q.ltp = quote.ltp;
    q.ltt = quote.ltt;
    q.close = quote.ltp;
    q.exchange = quote.exchange;
    
    return q;
}


export default {
    standardizeiq,
    standardizeoq,
    atmRefresh,
    addToCache,
    getCachedLists
  };