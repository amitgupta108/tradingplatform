import utils from '../../common/utils.mjs';
import { state_qutils } from '../session/appstate.mjs';
import { scripstore } from '../service/scripstore.mjs';
import {ordersimulator} from '../service/ordersimulator.mjs'
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

function standardizeiq(quote) {

    const { exchange_code: exchange, stock_code: stockCode, close: ltp, datetime, expiry_date, right, strike_price, ...rest } = quote;
    const qt = { exchange, stockCode, ltp, datetime, expiry_date, right, right_type, strike_price};

    qt.ltt = Date.parse(qt.datetime);

    if (qt.stockCode === 'CRUDE')
        qt.stockCode = 'CRUDEOIL';

    if (qt.expiry_date !== undefined)
        qt.expiry_date = (qt.expiry_date.replaceAll('-20', '').replaceAll('-', '')).toUpperCase();

    if (qt.exchange !== 'NSE' && qt.strike_price !== undefined) {
        qt.key = 'strikex';
        qt.right = qt.right_type !== undefined ? qt.right_type : (qt.right === 'Call' ? 'CE' : 'PE');
        qt.symbol = qt.stockCode + qt.expiry_date + qt.strike_price + qt.right;
    } else if (qt.expiry_date !== undefined) {
        qt.key = 'futures';
        qt.symbol = qt.stockCode + qt.expiry_date + 'FUT';
    }
    else {
        qt.key = qt.stockCode.endsWith('VIX') ? 'vix' : 'index';
        qt.symbol = qt.stockCode;
    }
    return qt;
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