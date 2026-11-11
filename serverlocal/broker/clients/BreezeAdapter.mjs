import { BreezeConnect } from 'breezeconnect';
import { Adapter } from './adapter.js';

export class BreezeAdapter extends Adapter {
    constructor() {
        super();
        this.name = 'BREEZEADAPTER';
        this.adapter = new BreezeConnect({ "appKey": process.env.breeze_appKey });
    }

    connect() {
        if (this.authenticated)
            return;
        return this.adapter.generateSession(process.env.breeze_secret, this.authData.sid)
            .then((resp) => {
                this.authenticated = true;
                this.log('breeze session started ');
/*
                this.adapter.wsConnect();
                this.adapter.onTicks = this.handleTicks.bind(this);
                this.ws = this.adapter.socket;
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
  */          }).catch((error) => {
                    this.error('breeze connection error ' + error);
                });
    }

    initiateConnect(authData) {
        this.authData = authData;
        return this.connect();
    }

    getHistory(scrip, sTime, endTime, interval) {
        const request = this.getRequest(scrip);
        request.interval = interval != undefined ? interval : '1second';
        request.fromDate = this.ISODate(sTime);
        request.toDate = this.ISODate(endTime);

        return this.adapter.getHistoricalDatav2(request);
    }

    subscribe(request, action) {
        if (action === 'subs')
            return this.adapter.subscribeFeeds([this.getRequest(request)]);
        else
            return this.adapter.unsubscribeFeeds([this.getRequest(request)]);
    }

    handleTicks(q) {
        if (q.symbol?.includes('VIX') || q.stock_code?.includes('VIX'))
            super.emit('vix', q);
        else
            super.emit('live-quote', q);
    }

    getRequest(scrip) {
        return {
            exchangeCode: scrip.exchange.toLowerCase().includes('fo') ? 'NFO' : 'NSE',
            stockCode: scrip.stockCode === 'CRUDEOIL' ? scrip.stockCode.slice(0, 5) : scrip.stockCode,
            strikePrice: scrip.strike,
            right: scrip.right === 'CE' ? 'Call' : 'Put',
            productType: scrip.right !== undefined ? 'options' : 'futures',
            expiryDate: this.formatExpiry(scrip.expiry, 'datetime')
        }
    }

    ISODate(datetime) {
        return (new Date(Math.round((datetime) / 1000) * 1000 + (330 * 60 * 1000))).toISOString();
    }

    formatExpiry(expiry, type) {
        if (expiry) {
            var e = expiry.slice(0, 2).concat('-').concat(expiry.slice(2, 3)).concat(expiry.slice(3, 5).toLowerCase()).concat('-20').concat(expiry.slice(5));
            return type === 'datetime' ? (new Date((e).concat(', 21:00'))).toISOString() : e; // add 5.30 to 15:30 to get 21:00 UTC
        }
    }
}