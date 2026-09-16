import { KMDClient } from '../../service/clients/KMDClient.mjs'
import { KotakMarketData } from './m_kotak.mjs';

const options = {
    autoReconnect: true,
    maxRetries: 2,
    retryDelay: 2000,
    heartbeatInterval: 10000,
    throttleInterval: 120000,
    logEnabled: true,
};

class KotakMarketDataLive extends KotakMarketData 
{
    constructor(name, provider)
    {
        super(name, provider);
        this.provider = new KMDClient(options);
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

export const m_kotak_live = new KotakMarketDataLive('KOTAKLIVEVIEW', undefined);