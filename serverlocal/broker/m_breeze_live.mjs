import utils from '../../common/utils.mjs';
import data_interface from '../../srvr/qserver.mjs';
import { BrokerMarketDataImpl } from './m_broker_interface.mjs';

class BreezeMarketDataLive extends BrokerMarketDataImpl 
{
    constructor(name, provider) 
    {
        super(name, provider);
    }

    addListeners() {
        this.provider.addListener('live-quote', (q, appid) => {
            this.onQuotes(q, appid);
        });
    }

    providerSubscribe(appid, requests, action) {
        if (action === 'subs' || action === 'start')
            this.provider.subscribe(requests);
        else
            this.provider.subscribe(requests);
    }

    standardize(q) 
    {
        const qt = { exchange: q.exchange_code};

        qt.stockCode = q.stock_code === 'CRUDE' ? 'CRUDEOIL' : q.stock_code;
        qt.ltp = Number(q.close);
        qt.ltt = Date.parse(q.datetime);
        qt.symbol = qt.stockCode;

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

    buildRequests(appid, list) 
    {
        const requests = [];
        list.forEach((e) => {
            if (this.symbol_cache.get(e.symbol) === undefined)
                this.symbol_cache.set(e.symbol, utils.expandSymbol(e.symbol));

            if (!(e.key === 'index' && e.exchange === 'MCX'))
                requests.push({ appid: appid, symbol: e.symbol, instrument: e });
        });
        return requests;
    }
}
export const m_icici_live = new BreezeMarketDataLive('ICICILIVEVIEW', data_interface);