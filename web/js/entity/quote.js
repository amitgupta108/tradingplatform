const EXCHANGES = {
    NIFTY: 'nse_fo',
    CRUDEOIL: 'mcx_fo'
}

class QuoteDispatcher extends EventTarget {

    constructor() {
        super();
        this.symbol_cache = new Map();
        this.lastfq;
        this.lastuq;
    }

    dispatchEvent(eventName, q) {
        if (q?.stockCode === 'INDVIX')
            q.key = 'vix';

        const scrip = this.toScrip(q.symbol);
        const qt = { ltp: q.ltp, ltt: q.ltt, ...scrip };

        super.dispatchEvent(generateEvent(scrip.key, qt));
        if (scrip.key === 'futures' && q.ltp !== this.lastfq?.ltp) {
            latency_label.textContent = Date.now() - q.ltt;
            this.lastfq = qt;
            if (q.exchange.toLowerCase().startsWith('mcx'))
                super.dispatchEvent(generateEvent('index', qt));
        }
    }

    toScrip(symbol) {
        if (this.symbol_cache.has(symbol)) {
            return this.symbol_cache.get(symbol);
        }

        const s = { symbol: symbol };
        const regex = /[0-9]/;
        const idx = symbol.search(regex);

        s.stockCode = idx === -1 ? symbol : symbol.slice(0, idx);
        s.exchange = ['NIFTY', 'INDVIX'].includes(symbol) ? 'nse_cm' : EXCHANGES[s.stockCode].toLowerCase();
        //s.key = symbol.endsWith('FUT') ? 'FUT' : symbol.endsWith('PE') || symbol.endsWith('CE') ? 'OPT' : 'IDX';
        s.key = symbol.endsWith('FUT') ? 'futures' : symbol.endsWith('PE') || symbol.endsWith('CE') ? 'strikex' : 'index';
        if (idx !== -1) {
            s.expiry = symbol.slice(idx, idx + 7);
            if (s.key === 'strikex') {
                s.strike = symbol.slice(idx + 7, -2);
                s.right = symbol.slice(-2);
            }
        }
        this.symbol_cache.set(symbol, s);
        return s;
    }
}