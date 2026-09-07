import utils from '../../common/utils.mjs'
import {simulator} from '../service/simmanager.mjs';
import { eventservice } from '../service/eventservice.mjs';
import { BrokerMarketDataImpl } from './m_broker_interface.mjs';

class BreezeMarketDataHist extends BrokerMarketDataImpl 
{
    constructor(name, provider) 
    {
        super(name, provider);
    }

    addListeners()
    {
        eventservice.addListener('hist-quote', (q, appid) => {
            this.onQuotes(q, appid);
        });
    }

    clientConfigure(appid, startTime, speed) 
    {
        this.provider.clientInit(appid, startTime, speed);
    }

    changeSpeed(appid, speed) {
        this.provider.changeSpeed(appid, speed);
    }

    providerSubscribe(appid, requests, action) 
    {
        if (action === 'subs')
            this.provider.subscribe(requests);
        else if( action === 'start')
            this.provider.start_sim(appid, requests);
        else
            this.provider.subscribe(requests);
    }
    
    standardize(q) 
    {
        return { ...q, ...this.symbol_cache.get(q.symbol) };
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

    exit(appid) {
        this.my_subs.removeSubscriptions(appid);
        return this.simulator.clear(appid);
    }
}

export const m_icici_hist = new BreezeMarketDataHist('ICICIHISTVIEW', simulator);