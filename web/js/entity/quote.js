class QuoteDispatcher extends EventTarget {

    constructor() {
        super();
        this.aggregate = 0;
        this.count = 1;
        this.start = 0;
    }

    dispatchEvent(eventName, q)
    {
        super.dispatchEvent(generateEvent(eventName, q));
        this.aggregate += (Date.now() - q.ltt);
        this.count++;
        latency_label.textContent = Math.round(this.aggregate / this.count); 
    }

    reset()
    {
        this.aggregate = 0;
        this.count = 1;
    }
}