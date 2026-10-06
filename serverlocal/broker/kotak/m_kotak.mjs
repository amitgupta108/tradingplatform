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

        if (requests.i_reqs.length > 0)
            this.adapter.subscribe(requests.i_reqs, 'Indices', action, false);

        if (requests.s_reqs.length > 0)
            this.adapter.subscribe(requests.s_reqs, 'Scrips', action, false);
    }

    buildRequests(list) 
    {
        const indices = [], scrips = [];
        list.forEach((e) => {
            if(e.key === 'index') {
                e.token = e.symbol === 'NIFTY' ? 'NIFTY 50' : e.symbol;
                indices.push(e.exchange + '|' + e.token);
            } else {
                e.token = this.scrips.findScripByRefKey(e.symbol)?.token;
                scrips.push(e.exchange + '|' + e.token);
            }

            if (this.symbol_cache.get(e.token) === undefined)
                this.symbol_cache.set(e.token, e);
        });
        return {i_reqs: indices, s_reqs: scrips};
    }
}
