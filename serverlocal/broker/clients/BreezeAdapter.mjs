import { BreezeConnect } from 'breezeconnect';
import { BrokerAdapter } from './BrokerAdpater.mjs';

export class BreezeAdapter extends BrokerAdapter {
    
    static instance = null;
    static getInstance(options = {})
    {
        if (!BreezeAdapter.instance) {
            BreezeAdapter.instance = BreezeAdapter.createInstance(options);
        }
        return BreezeAdapter.instance;
    }

    static createInstance(options){
        return new BreezeAdapter(options);
    }

    constructor(options){
        super('BREEZEADAPTER', options);
        this.self;
        this.sessionOn = false;
    }

    connect(withSocket)
    {
        if(this.sessionOn)
            return;

        this.self = new BreezeConnect({ "appKey": process.env.breeze_appKey });
        this.sessionOn = true;

        return this.self.generateSession(this.authdata.apiSecret, this.authdata.authcode)
        .then((resp) => {
            
            if(withSocket) {
                this.self.wsConnect();
                this.self.onTicks = this.handleTicks.bind(this);
                this.log('breeze session started ');
                this.ws = this.self.socket;
                this.ws.on('connect', () => {
                    this.isConnected = true;
                    this.log('breeze socket connected');
                });

                this.ws.on('connect_error', () => {
                    this.log('breeze socket connection error');
                });

                this.ws.on('disconnect', () => {
                    this.isConnected = false;
                    this.log('breeze socket disconnected');
                });
            }
        }).catch((error) => {
            this.error('breeze connection error ' + error);
            this.sessionOn = false;
        });
    }

    initiateConnect(authdata, withSocket = false)
    {
        this.authdata = authdata;
        return this.connect(withSocket);
    }
    
    getHistory(scrip, sTime, endTime, interval) 
    {
        const request = this.getRequest(scrip);
        request.interval = interval != undefined ? interval : '1second';
        request.fromDate = this.ISODate(sTime);
        request.toDate = this.ISODate(endTime); 
            
        return this.self.getHistoricalDatav2(request);
    }

    subscribeQuotes(list, action)
    {
        const promises = [];
        list.forEach((e) => {
            var request = this.getRequest(e.instrument);
            request.get_exchange_quotes = true;
            promises.push(this.subscribeFeed(request, action));
        });
        return Promise.all(promises);
    }

    subscribeFeed(request, action)
    { 
        if(action === 'subs')
            return this.self.subscribeFeeds(request);
        else
            return this.self.unsubscribeFeeds(request);
    }

    handleTicks(q)
    {
        if (q.symbol?.includes('VIX') || q.stock_code?.includes('VIX'))
            super.emit('vix', q);
        else 
            super.emit('live-quote', q);
    }
    
    getRequest(scrip)
    {       
        return { 
            exchangeCode: scrip.exchange.toLowerCase().includes('fo') ? 'NFO' : 'NSE',
            stockCode: scrip.stockCode === 'CRUDEOIL' ? scrip.stockCode.slice(0, 5) : scrip.stockCode,
            strikePrice: scrip.strike,
            right: scrip.right === 'CE' ? 'Call' : 'Put',
            productType: scrip.right !== undefined ? 'options' : 'futures',
            expiryDate: this.formatExpiry(scrip.expiry, 'datetime')
        }
    }

    ISODate(datetime) 
    {
        return (new Date(Math.round((datetime)/1000) * 1000 + (330 * 60 * 1000))).toISOString();
    }

    formatExpiry(expiry, type) 
    {
        if(expiry) {
            var e = expiry.slice(0, 2).concat('-').concat(expiry.slice(2, 3)).concat(expiry.slice(3, 5).toLowerCase()).concat('-20').concat(expiry.slice(5));
            return type === 'datetime' ? (new Date((e).concat(', 21:00'))).toISOString() : e; // add 5.30 to 15:30 to get 21:00 UTC
        }
    }
}