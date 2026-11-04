import utils from '../../../common/utils.mjs';
import { ConfigService } from '../../service/.config/configservice.mjs';
import { BrokerMarketDataImpl } from '../common/m_broker_interface.mjs';

export class BreezeMarketData extends BrokerMarketDataImpl{
    constructor(name){
        super(name);
    }

    addListeners()
    {
        this.es.addListener('icici_auth', (authdata) => {
            this.onAuthData(authdata);
        });

        this.af = ConfigService.getServiceByName('ADAPTERFACTORY');
        this.adapter = this.af.getAdapter('BREEZEADAPTER');
        this.adapter.addListener('quote', (q) => {
            this.onQuotes(q);
        });
    }

    onAuthData(authdata) {
        this.authData = authdata;
        this.adapter.initiateConnect(this.authData);
        this.initialized = true;
    }

    buildRequests(appid, list) 
    {
        const requests = [];
        list.forEach((e) => {
            if (this.symbol_cache.get(e.symbol) === undefined)
                this.symbol_cache.set(e.symbol, utils.expandSymbol(e.symbol));
            
            e.exchange = e.exchange === 'nse_cm' ? 'NSE' : e.exchange === 'nse_fo' ? 'NFO' : null;
            if (!(e.key === 'index' && e.exchange === 'MCX'))
                requests.push({ appid: appid, symbol: e.symbol, instrument: e });
        });
        return requests;
    }
}