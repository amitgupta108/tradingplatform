import { BreezeConnect } from 'breezeconnect';
import { TPAdapter } from './adapter.js';
import { ConfigService } from '../../service/config/configservice.mjs';

export class BreezeAdapter extends TPAdapter {
    constructor() {
        super('BREEZEADAPTER', 'breeze');
        this.isConnected = false;
        this.breeze = new BreezeConnect({ "appKey": process.env.breeze_appKey });
        //this.iSocket;
    }

    async onAuthData(authData) {
        if (authData.date === new Date().toDateString()) {
            this.authData = authData;
            return await this.connect()
                .catch(e => {
                    this.error('breeze connection error ' + e);
                    return this.authenticated;
                });
        }
        this.log(`status: [${this.provider}-${this.isAuthenticated}]`);
        return this.authenticated;
    }

    async connect() {
        return this.breeze.generateSession(process.env.breeze_secret,
            this.authData.sid ?? this.authData.authcode)
            .then((resp) => {
                this.log('breeze session started ');

                this.breeze.wsConnect();
                this.breeze.onTicks = this.handleTicks.bind(this);
                /*this.iSocket = this.breeze.socket;
                this.iSocket.on('connect', () => {
                    this.isConnected = true;
                    this.log('breeze socket connected');
                });

                this.iSocket.on('connect_error', () => {
                    this.log('breeze socket connection error');
                });

                this.iSocket.on('disconnect', () => {
                    this.isConnected = false;
                    this.log('breeze socket disconnected');
                });*/
                this.authenticated = true;
            }).catch((error) => {
                this.error('breeze connection error ' + error);
            });
    }

    getHistory(scrip, sTime, endTime, interval) {
        const request = this.getRequest(scrip);
        request.interval = interval != undefined ? interval : '1second';
        request.fromDate = this.ISODate(sTime);
        request.toDate = this.ISODate(endTime);

        return this.breeze.getHistoricalDatav2(request);
    }

    subscribe(request, action) {
        if (action === 'subs')
            return this.breeze.subscribeFeeds([this.getRequest(request)]);
        else
            return this.breeze.unsubscribeFeeds([this.getRequest(request)]);
    }

    handleTicks(q) {
        if (q.symbol?.includes('VIX') || q.stock_code?.includes('VIX'))
            this.emit('vix', q);
        else
            this.emit('live-quote', q);
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