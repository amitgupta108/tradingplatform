class QuoteDispatcher extends EventTarget {

    constructor() {
        super();
        this.quote_cache = new Map();
        this.aggregate = 0;
        this.count = 1;
    }

    dispatchEvent(eventName, q)
    {
        if(q?.min){
            let qt = this.quote_cache.get('k_m' + q.tk);
            if(qt === undefined) {
                qt = expandSymbol(q.symbol);
                this.quote_cache.set('k_m' + q.tk, qt);
            }
            q = {...q, ...qt};
        }
        this.aggregate += (Date.now() - q.m1);
        this.count++;
        latency_label.textContent = Math.round(this.aggregate / this.count); 
        super.dispatchEvent(generateEvent(eventName, q));
    }
}