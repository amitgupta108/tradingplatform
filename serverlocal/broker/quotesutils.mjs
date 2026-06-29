const regex = /[0-9]/;
const symbol_cache = new Map();

function addtocache(symbol, idx) {
    if (symbol_cache.has(symbol))
        return symbol_cache.get(symbol);

    const expiry = symbol.slice(idx, idx + 7);
    const cached = { expiry: expiry };

    if (!symbol.endsWith('FUT')) {
        cached.strike = symbol.slice(idx + 7, -2);
        cached.right = symbol.slice(-2);
    }
    symbol_cache.set(symbol, cached);
    return cached;
}

function standardizeiq(qt) {
    const tStart = process.hrtime.bigint();
    if (typeof qt.ltt === 'string')
        return { key: 'vix', stockCode: qt.stock_code, exchange: qt.exchange_code, ltp: qt.last, ltt: qt.ltt = Date.parse(qt.ltt) };


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

function standardizeoq(q) {
    q.ltp = Number(q.ltp);
    q.ltt = Number(q.ltt);
    q.close = (q.ltp);
    q.open = q.ltp;

    const idx = q.symbol.search(regex);
    const st_code = idx === -1 ? q.symbol : q.symbol.slice(0, idx);
    q.stockCode = st_code;
    q.key = q.symbol.endsWith('FUT') ? 'futures' : q.symbol.endsWith('PE') || q.symbol.endsWith('CE') ? 'strikex' : 'index';

    if (idx === -1)
        return q;

    const cached = addtocache(q.symbol, idx);
    q.expiry_date = cached.expiry;
    q.right = cached.right;
    q.strike_price = cached.strike;

    return q;
}

export default {
    standardizeiq,
    standardizeoq
  };