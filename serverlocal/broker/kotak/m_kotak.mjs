import { eventservice } from '../../service/eventservice.mjs';
import { BrokerMarketDataImpl } from '../common/m_broker_interface.mjs';
import { scripstore } from '../../service/scripstore.mjs';

export class KotakMarketData extends BrokerMarketDataImpl 
{
    constructor(name, provider)
    {
        super(name, provider);
    }

    addListeners() {
        this.provider.addListener('quote', (arg) => this.onQuotes(arg));
        this.provider.addListener('snapshot', (arg) => this.onSnapshot(arg));
        eventservice.addListener('kotak_auth', (arg) => this.onAuthdata(arg));
    }

    onAuthdata(authdata) {
        this.authData = authdata;
        this.provider.initiateConnect(this.authData);
        this.initialized = true;
        console.log('Kotak authdata available');
    }

    subscribe(appid, list, action) {
        this.my_subs.addRequests(appid, list);
        const requests = this.buildRequests(list);

        if (requests.i_reqs.length > 0)
            this.provider.subscribe(requests.i_reqs, 'Indices', action, false);

        if (requests.s_reqs.length > 0)
            this.provider.subscribe(requests.s_reqs, 'Scrips', action, false);
    }

    buildRequests(list) 
    {
        const indices = [], scrips = [];
        list.forEach((e) => {
            if(e.key === 'index') {
                e.token = e.symbol === 'NIFTY' ? 'NIFTY 50' : e.symbol;
                indices.push(e.exchange + '|' + e.token);
            } else {
                e.token = scripstore.findScripByRefKey(e.symbol)?.token;
                scrips.push(e.exchange + '|' + e.token);
            }

            if (this.symbol_cache.get(e.token) === undefined)
                this.symbol_cache.set(e.token, e);
        });
        return {i_reqs: indices, s_reqs: scrips};
    }
}
