import { BreezeConnect } from 'breezeconnect';
import { TPAdapter } from './adapter.js';
import type { AuthData, Quote } from '../../utils/types.js';
import { toScrip } from '../../utils/constants.js';

export class BreezeAdapter extends TPAdapter {
    breeze: BreezeConnect;

    constructor() {
        super('BREEZEADAPTER', 'icici');
        this.breeze = new BreezeConnect({ "appKey": process.env.breeze_appKey });
    }

    async onAuthData(authData: AuthData) {
        if (authData.date === new Date().toDateString() && !this.isConnected) {
            this.authData = authData;
            await this.connect();

            this.log(`status: [${this.provider}-${this.isConnected}]`);
        }
        return this.isConnected;
    }

    async connect(): Promise<void> {
        if (this.isConnecting || this.isConnected) {
            return;
        }
        this.isConnecting = true;
        this.breeze.generateSession(process.env.breeze_secret as string, this.authData?.sid as string)
            .then((resp: any) => {
                this.isConnected = true;
                this.isConnecting = false;
                this.log('breeze session started ');

                //this.breeze.wsConnect();
                this.breeze.onTicks = this.handleTicks.bind(this);
            }).catch((error: any) => {
                this.error('breeze connection error ' + error);
            });
    }

    getHistory(symbol: string, sTime: number, endTime: number, interval?: string) {
        const request = this.getRequest(symbol) as any;
        request.interval = interval != undefined ? interval : '5minute';
        request.fromDate = this.ISODate(sTime);
        request.toDate = this.ISODate(endTime);

        return this.breeze.getHistoricalDatav2(request);
    }

    subscribe(symbols: string[], action: string) {
        for (const s of symbols) {
            if (action === 'subs')
                this.breeze.subscribeFeeds([this.getRequest(s)]);
            else
                this.breeze.unsubscribeFeeds([this.getRequest(s)]);
        }
    }

    handleTicks(q: any) {
        if (q?.stock_code?.includes('VIX'))
            this.emit('vix', q);
        else
            this.emit('live-quote', q);
    }

    emitQuote(appid: string, q: Quote) {
        this.emit('quote', appid, q);
    }

    private getRequest(symbol: string, type = 'history') {
        const scrip = toScrip(symbol);

        return {
            exchangeCode: scrip.exchange === 'nse_cm' ? 'NSE' : scrip.exchange === 'nse_fo' ? 'NFO' : 'MCX',
            stockCode: scrip.stockCode === 'CRUDEOIL' ? scrip.stockCode.slice(0, 5) : scrip.stockCode,
            strikePrice: scrip.strike,
            right: scrip.key === 'OPT' && scrip.call ? 'Call' : 'Put',
            productType: scrip.key === 'OPT' ? 'options' : 'futures',
            expiryDate: this.formatExpiry(scrip.expiry!, type)
        }
    }

    private ISODate(datetime: number): string {
        return (new Date(Math.round((datetime) / 1000) * 1000 + (330 * 60 * 1000))).toISOString();
    }

    private formatExpiry(expiry: string, type: string): string | undefined {
        if (!expiry)
            return;
        else if (type === 'history')
            return new Date((expiry.concat(', 05:30'))).toISOString();
        else
            return expiry.slice(0, 2).concat('-').concat(expiry.slice(2, 3)).concat(expiry.slice(3, 5).toLowerCase()).concat('-20').concat(expiry.slice(5));
    }
}