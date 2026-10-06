class QuoteDispatcher extends EventTarget {

    constructor() {
        super();
        this.lastfq;
        this.lastuq;
    }

    dispatchEvent(eventName, q)
    {
        super.dispatchEvent(generateEvent(q.key, q));
        if (q.key === 'futures' && q.ltp !== this.lastfq?.ltp){
            latency_label.textContent = Date.now() - q.ltt; 
            this.lastfq = q;
            if(q.exchange.toLowerCase().startsWith('mcx'))
                super.dispatchEvent(generateEvent('index', q));
        }
    }
}