class QuoteDispatcher extends EventTarget {

    constructor() {
        this.quote_cache = new Map();
    }

    dispatchEvent(eventName, q)
    {
        if(q.min){
            let qt = this.quote_cache.get('k_m' + q.tk);
            if(qt === undefined) {
                qt = expandSymbol(q.symbol);
                this.quote_cache.set('k_m' + q.tk, qt);
            }
            q = {...q, ...qt};
        }
        this.dispatchEvent(generateEvent(eventName, q));
    }
}