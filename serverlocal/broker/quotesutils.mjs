import utils from '../../common/utils.mjs';
import { OPT_EXPIRIES, STRIKE_SIZE } from '../../common/constants.mjs';
import { subs_store_all, Subscriptions, state_qutils } from '../session/appstate.mjs';
import simulator from '../service/ordersimulator.mjs';
import { scripstore } from '../service/scripstore.mjs';
import { parse } from 'date-fns';

const pattern = "dd/MM/yyyy HH:mm:ss";
const symbol_cache = new Map();

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
    q.m1 = Date.now();
    switch (name) {
        case 'KOTAKHSMVIEW':
            return standardizekq(q) 
        case 'OPENALGOVIEW':
            return standardizeoq(q) 
        case 'ICICILIVEVIEW': 
            return standardizeiq(q) 
        case 'ICICIHISTVIEW':
            return standardizeiq(q) 
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
    const qt = state_qutils.quote_cache.get(quote.tk);
    if (qt !== undefined) {
        if (quote.name === 'sf' && quote.ltp !== undefined) {
            qt.ltp = Number(quote.ltp);
            qt.ltt = quote.m1 - qt.offset;
            return qt;
        }
        else if(quote.name === 'if' && quote.iv !== undefined) {
            qt.ltp = Number(quote.iv);
            qt.ltt = quote.m1 - qt.offset;
            return qt;
        }
    }
}

function toScrip(snapshot)
{
    const qt = state_qutils.quote_cache.get(snapshot.tk);
    if (qt === undefined)
    {
        if(snapshot.name === 'sf') {
            const fdtm = snapshot.fdtm !== undefined ? parse(snapshot.fdtm, pattern, new Date()).getTime() : Date.now() ;
            const { e: exchange, ts: tSymbol, ltp: ltp, ...rest } = snapshot;
            const qt = { exchange, tSymbol, ltp};

            qt.symbol = snapshot.e === 'nse_fo' ? scripstore.findScripByKey('token', snapshot.tk)?.scripReferenceKey : snapshot.ts;
            qt.ltp = Number(qt.ltp);
            qt.ltt = fdtm;
            qt.offset = Date.now() - fdtm;
            state_qutils.quote_cache.set(snapshot.tk, { ...qt, ...utils.expandSymbol(qt.symbol) });
        }
        else if (snapshot.name === 'if') {
            const tvalue = snapshot.tvalue !== undefined ? parse(snapshot.tvalue, pattern, new Date()).getTime() : Date.now();
            const { tk: token, e: exchange, iv: ltp,  ...rest } = snapshot;
            const qt = { token, exchange, ltp};

            qt.symbol = snapshot.tk;
            qt.ltp = Number(qt.ltp);
            qt.ltt = tvalue;
            qt.offset = Date.now() - tvalue;
            state_qutils.quote_cache.set(snapshot.tk, { ...qt, ...utils.expandSymbol(qt.symbol) });
        }
    }
    return state_qutils.quote_cache.get(snapshot.tk);
}

function sendQsToSim(view_mode, q)
{
    if(simulator.initialized === true && simulator.open_orders[view_mode])
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
    toScrip,
  };