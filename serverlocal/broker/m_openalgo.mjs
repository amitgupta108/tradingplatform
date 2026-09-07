import OpenAlgo from 'openalgo';
import utils from '../../common/utils.mjs';
import { BrokerMarketDataImpl } from './m_broker_interface.mjs';

class OpenAlgoMarketData extends BrokerMarketDataImpl 
{
    constructor(name, provider)
    {
        super(name, provider);
        this.ws_direct;
        this.reconn_count = 0; 
    }
    
    addListeners() 
    {
        if (!this.provider)
            this.provider = new OpenAlgo(process.env.openalgo_key, process.env.openalgo_http, 'v1', process.env.openalgo_ws);

        return this.provider.connect()
        .then(() => {
            this.initialized = true;
            this.ws_direct = this.provider._wsClient.ws;
            this.ws_direct.addEventListener('close', () => {
                console.log('openalgo websocket state ' + this.ws_direct.readyState);
                this.autoStart();
            });
            return { status: 'success' }
        }).catch((error) => {
            this.provider._wsClient.shouldReconnect = false;
            throw error;
        });
    }

    autoStart() 
    {    
        setTimeout(() => {
            const list = this.my_subs.getFullSubsList(true);
            list.forEach(([k, v]) => 
            {
                const requests = v.getSubsItems(['index', 'futures']);
                this.subscribe(k, requests, 'subs');
                const chains = v.getActiveOptionChains();
                chains.forEach((oc) => {
                    this.subscribe(k, oc.strikes, 'subs');
                });
            });

            this.ws_direct = this.provider._wsClient.ws;
            this.ws_direct.addEventListener('close', () => {
                console.log('openalgo websocket reconn count ' + this.reconn_count);
                this.autoStart();
            })
        }, 5000);
    }

    providerSubscribe(appid, requests, action) 
    {
        if (action === 'subs' || action === 'start')
            this.provider.subscribe_ltp(requests, (q) => 
                this.onQuotes(q));
        else
            this.provider.unsubscribe_ltp(requests);
    }

    standardize(qt) 
    {
        return { ...qt, ...this.symbol_cache.get(qt.symbol) };
    }
    
    buildRequests(appid, requests) 
    {
        requests.forEach((r) => {
            if (this.symbol_cache.get(r.symbol) === undefined)
                this.symbol_cache.set(r.symbol, utils.expandSymbol(r.symbol));

            if (r.key === 'index')
                r.exchange = 'NSE_INDEX';
        });

        return requests;
    }

    exit(appid, sublist) {
        if (client?._wsClient?.isConnected)
            client?._wsClient?.ws._sendMessage({ action: unsubscribe_all });
    }
}

export const m_openalgo_live = new OpenAlgoMarketData('OPENALGOVIEW', undefined);