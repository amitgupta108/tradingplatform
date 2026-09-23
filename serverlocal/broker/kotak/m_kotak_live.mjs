import { KotakMarketData } from './m_kotak.mjs';

export class KotakMarketDataLive extends KotakMarketData 
{
    constructor(name, provider)
    {
        super(name, provider);
        this.provider = provider;
    }

    snapshot(appid, list) 
    {
        this.my_subs.addRequests(appid, list);
        const requests = this.buildRequests(list);
        this.provider.snapshot(requests, 'Scrips', false);
    }

    onSnapshot(snapshot)
    {
        const qt = this.symbol_cache.get(snapshot.token);
        this.emitQuotes(qt);
    }

    standardize(q)
    {
        const qt = this.symbol_cache.get(q.token.toUpperCase());
        if (qt !== undefined && q.ltp !== undefined) {
            qt.expiry_date = qt.expiry;
            qt.strike_price = qt.strike;
            qt.ltp = q.ltp;
            qt.ltt = q.m1;
            return qt;
        }
    }
}