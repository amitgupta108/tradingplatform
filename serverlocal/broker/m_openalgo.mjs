import OpenAlgo from 'openalgo';
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
            const list = this.my_subs.getFullSubsList();
            for(const [k, v] of list)
            {
                const requests = v.getSubsItems(['index', 'futures']);
                this.subscribe(k, requests, 'subs');
                const chains = v.getActiveOptionChains();
                chains.forEach((oc) => {
                    this.subscribe(k, oc.strikes, 'subs');
                });
            }

            this.ws_direct = this.provider._wsClient.ws;
            this.ws_direct.addEventListener('close', () => {
                console.log('openalgo websocket reconn count ' + this.reconn_count);
                this.autoStart();
            })
        }, 5000);
    }

    providerStart(appid, requests)
    {
        this.buildRequests(appid, requests);
        this.my_subs.addRequests(requests);
        this.provider.subscribe_ltp(requests, (q) => {
            this.onQuotes(q);
        });
    }

    standardize(qt) 
    {
        return { ...qt, ...this.symbol_cache.get(qt.symbol) };
    }
    
    buildRequests(appid, requests) 
    {
        requests.forEach((r) => {
            if (r.key === 'index')
                r.exchange = 'NSE_INDEX';
        });
    }

    option_chain(appid, stockCode, expiry, action)
    {
        const stock_subs = my_subs.getSubscriptions(stockCode + 'LIVE_2');
        const response = stock_subs.optionChainAction(expiry, action);
        if(response !== undefined) {
            this.subscribe(appid, response.strikes, response.action);
        }
    }
}

export const m_openalgo_live = new OpenAlgoMarketData('OPENALGOVIEW', undefined);