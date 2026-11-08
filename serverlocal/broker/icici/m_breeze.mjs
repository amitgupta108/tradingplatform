import { ConfigService } from '../../service/.config/configservice.mjs';
import { BrokerMarketDataImpl } from '../common/m_broker_interface.mjs';

export class BreezeMarketData extends BrokerMarketDataImpl {
    constructor(name) {
        super(name);
    }

    addListeners() {
        this.es.addListener('icici_auth', (authdata) => {
            this.onAuthData(authdata);
        });

        this.af = ConfigService.getServiceByName('ADAPTERFACTORY');
        this.adapter = this.af.getAdapter('BREEZEADAPTER');
        this.adapter.addListener('quote', (q) => {
            this.onQuotes(q);
        });
    }

    buildRequests(appid, list) {
        return list.map((e) => {
            if (this.symbol_cache.get(e.symbol) === undefined)
                this.symbol_cache.set(e.symbol, this.getScrip(e.symbol));

            return { appid: appid, symbol: e.symbol, instrument: e };
        });
    }

    indicesRequest(appid, stockCode) {

        let indices = (stockCode === 'NIFTY') ? ['NIFTY', 'VIX'] : [];
        return indices.map((symbol) => {
            const key = symbol === 'NIFTY' ? 'index' : 'vix';
            const stockCode = symbol === 'VIX' ? 'INDVIX' : symbol;

            const request = { exchange: 'nse_cm', key: key, stockCode: stockCode, symbol: symbol, interval: '1second' };
            if (this.symbol_cache.get(symbol) === undefined)
                this.symbol_cache.set(symbol, { exchange: 'nse_cm', key: key, stockCode: stockCode, symbol: symbol });

            return { appid: appid, symbol: symbol, instrument: request };

        });

    }
}