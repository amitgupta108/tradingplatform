import { ConfigService } from '../../service/.config/configservice.mjs';
import { BrokerMarketDataImpl } from '../common/m_broker_interface.mjs';

export class KotakMarketData extends BrokerMarketDataImpl 
{
    constructor(name)
    {
        super(name);
        this.scrips = ConfigService.getServiceByName('SCRIPSTORE');
    }

    addListeners() {
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
        this.es.addListener('kotak_auth', (arg) => this.onAuthdata(arg));

        const adapter = this.name === 'KOTAKLIVEVIEW' ? 'KMDCLIENT' : 'HSMCLIENT';
        this.sf = ConfigService.getServiceByName('ADAPTERFACTORY');
        this.adapter = this.sf.getAdapter(adapter);
        this.adapter.addListener('quote', (arg) => this.onQuotes(arg));
        this.adapter.addListener('snapshot', (arg) => this.onSnapshot(arg));
    }

    onAuthdata(authdata) {
        this.authData = authdata;
        this.adapter.initiateConnect(this.authData);
        this.initialized = true;
        console.log('Kotak authdata available');
    }

    subscribe(appid, list, action) 
    {
        action = action === 'start' ? 'subs' : action;
        this.my_subs.addRequests(appid, list);
        const requests = this.buildRequests(list);

        if (requests.length > 0)
            this.adapter.subscribe(requests, 'Scrips', action, false);
    }

    subscribeIndices(appid, stockCode){
        let requests = [];
        if(stockCode === 'NIFTY') {
            requests = ['nse_cm|NIFTY 50', 'nse_cm|INDIA VIX'];
            this.my_subs.addRequests(appid, [{'symbol': 'NIFTY'}, {'symbol': 'VIX'}]);
            this.symbol_cache.set('NIFTY 50', {symbol: 'NIFTY', exchange: 'nse_cm', stockCode: 'NIFTY', token: 'Nifty 50', key: 'index'});
            this.symbol_cache.set('INDIA VIX', {symbol: 'VIX', exchange: 'nse_cm', stockCode: 'VIX', token: 'INDIA VIX', key: 'vix'});
        }
        if(requests.length > 0)
            this.adapter.subscribe(requests, 'Indices', 'subscribe', false);
    }

    buildRequests(list) 
    {
        const scrips = [];
        list.forEach((e) => {
            const scrip = this.scrips.findScripByRefKey(e.symbol);
            if (scrip !== undefined) {
                e.token = scrip.token;
                e.exchange = scrip.exchangeSegment;
                scrips.push(e.exchange + '|' + e.token);
            }

            if (e.token && e.exchange && this.symbol_cache.get(e.token) === undefined)
                this.symbol_cache.set(e.token, e);
        });
        return scrips;
    }
}
