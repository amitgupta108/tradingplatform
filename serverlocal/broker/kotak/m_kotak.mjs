import { eventservice } from '../../service/eventservice.mjs';
import { BrokerMarketDataImpl } from '../common/m_broker_interface.mjs';
import utils from '../../../common/utils.mjs';
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

    buildRequests(list) 
    {
        const requests = [];
        list.forEach((e) => {

            const exchange = e.exchange === 'MCX' ? 'mcx_fo' : e.key === 'index' ? 'nse_cm' : 'nse_fo';    
            const mcx_index = e.key === 'index' && e.exchange === 'MCX'; 
            const token = e.key === 'index' && !mcx_index ? '26000' : scripstore.findScripByRefKey(e.symbol)?.token;
            if (this.symbol_cache.get(token) === undefined)
            {
                const t = utils.expandSymbol(e.symbol);
                t.token = token; t.exchange = exchange;
                this.symbol_cache.set(token, t);
            }
            if(exchange !== undefined && token !== undefined && !mcx_index)
                requests.push(exchange + '|' + token);
        });
        return requests;
    }
}
