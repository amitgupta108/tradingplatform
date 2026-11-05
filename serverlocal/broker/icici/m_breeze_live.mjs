import { BreezeMarketData } from './m_breeze.mjs';

export class BreezeMarketDataLive extends BreezeMarketData
{
    constructor(name) 
    {
        super(name);
    }

    onAuthData(authdata) {
        this.authData = authdata;
        this.adapter.initiateConnect(this.authData, true);
        this.initialized = true;
    }

    subscribe(appid, list, action) 
    {
        this.subscriptions.addRequests(appid, list);
        const requests = this.buildRequests(appid, list);
        this.adapter.subscribeQuotes(requests, action);
    }

    subscribeIndices(appid, stockCode) {
        const requests = this.indicesRequest(stockCode);
        this.subscriptions.addRequests(appid, requests);
        this.adapter.subscribeQuotes(requests, 'subs');
    }

    standardize(q) 
    {
        const qt = { exchange: q.exchange_code};

        qt.stockCode = q.stock_code === 'CRUDE' ? 'CRUDEOIL' : q.stock_code;
        qt.ltp = Number(q.close);
        qt.ltt = Date.parse(q.datetime);
        qt.symbol = qt.stockCode === 'INDVIX' ? 'VIX' :  qt.stockCode;

        if (q.expiry_date !== undefined) {
            qt.expiry_date = (q.expiry_date.replaceAll('-20', '').replaceAll('-', '')).toUpperCase();
            qt.symbol = qt.symbol + qt.expiry_date;

            if (q.strike_price !== undefined)
                qt.symbol = qt.symbol + q.strike_price.replace('.0', '') + q.right_type;
            else
                qt.symbol = qt.symbol + 'FUT';
        }
        return { ...qt, ...this.symbol_cache.get(qt.symbol) };
    }

    subscribe_vix(appid, mode, action)
    {    
        return this.adapter.subscribe_vix(appid, mode, action);
    }
}