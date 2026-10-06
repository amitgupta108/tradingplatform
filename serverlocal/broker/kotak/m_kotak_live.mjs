import { KotakMarketData } from './m_kotak.mjs';
import { streamer } from '../../stream.mjs';

export class KotakMarketDataLive extends KotakMarketData 
{
    constructor(name)
    {
        super(name);
    }

    snapshot(appid, list) 
    {
        this.my_subs.addRequests(appid, list);
        const requests = this.buildRequests(list);
        this.adapter.snapshot(requests, 'Scrips', false);
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
            qt.ltt = q.ltt * 1000;
            qt.yclose = q.close;
            return qt;
        }
    }

    async history(appid, r) 
    {
        const scrip = this.scrips.findScripByRefKey(r.symbol);
        r.scrip = scrip.exchange + '|' + scrip.token;
        if(['nse_cm', 'nse_fo'].includes(scrip.exchange))
        {
            const response = await this.adapter.history(r);
            if(response.ok)
            {
                const qA = await response.json();
                streamer.emitHistQs(appid, r.symbol, qA.data.candles);
                return {status: 'success'};
            }
        }
    }
}