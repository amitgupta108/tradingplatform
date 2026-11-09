function strikes(price, startIdx = 2, endIdx = 7, sz) {
    const atmIdx = Math.round(price / sz);
    const idxs = endIdx - startIdx;
    var strikes = new Array(idxs * 2);

    for (var j = startIdx; j <= endIdx; j++) {
        strikes[j - startIdx] = { strike: (atmIdx - j) * sz, right: 'PE' };
        strikes[j + idxs - startIdx + 1] = { strike: (atmIdx + j) * sz, right: 'CE' };
    }
    return strikes;
}

function expandSymbol(symbol) {
    const t = { symbol: symbol } //template
    const regex = /[0-9]/;
    const idx = symbol.search(regex);
    t.stockCode = idx === -1 ? symbol : symbol.slice(0, idx);
    t.key = symbol.endsWith('FUT') ? 'futures' : symbol.endsWith('PE') || symbol.endsWith('CE') ? 'strikex' : 'index';
    if (idx !== -1) {
        t.expiry_date = symbol.slice(idx, idx + 7);
        t.expiry = t.expiry_date;
        if (!symbol.endsWith('FUT')) {
            t.strike_price = symbol.slice(idx + 7, -2);
            t.strike = t.strike_price;
            t.right = symbol.slice(-2);
        }
    }
    return t;
}

function getScrip(symbol) {
    const t = { symbol: symbol } //template
    const regex = /[0-9]/;
    const idx = symbol.search(regex);
    t.stockCode = idx === -1 ? symbol : symbol.slice(0, idx);
    t.key = symbol.endsWith('FUT') ? 'futures' : symbol.endsWith('PE') || symbol.endsWith('CE') ? 'strikex' : 'index';
    if (idx !== -1) {
        t.expiry = symbol.slice(idx, idx + 7);
        if (!symbol.endsWith('FUT')) {
            t.strike = symbol.slice(idx + 7, -2);
            t.right = symbol.slice(-2);
        }
    }
    return t;
}

function getWSfolder() {
    return path.join(__dirname, '..');
}

export default {
    strikes,
    expandSymbol,
    getScrip,
    getWSfolder
};