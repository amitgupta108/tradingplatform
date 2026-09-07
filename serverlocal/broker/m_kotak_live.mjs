import {scripstore} from '../service/scripstore.mjs';
import { eventservice } from '../service/eventservice.mjs';
import { HSMClient } from '../../dist/marketdatafeed/websocket/HSMClient.js'
import { BrokerMarketDataImpl } from './m_broker_interface.mjs';
import utils from '../../common/utils.mjs';
import { parse } from 'date-fns';

const pattern = "dd/MM/yyyy HH:mm:ss";
const options = {
    autoReconnect: true,
    maxRetries: 2,
    retryDelay: 2000,
    heartbeatInterval: 10000,
    throttleInterval: 120000,
    logEnabled: true,
};

class KotakMarketDataLive extends BrokerMarketDataImpl
{
    constructor(name, provider)
    {
        super(name, provider);
        this.provider = new HSMClient(options);
    }

    addListeners()
    {
        this.provider.addListener('quote', (arg) => this.onQuotes(arg));
        this.provider.addListener('snapshot', (arg) => this.onSnapshot(arg));
        eventservice.addListener('kotak_auth', (arg) => this.onAuthdata(arg));
    }

    onAuthdata(authdata)
    {
        this.authData = authdata;
        this.provider.initiateConnect(this.authData);
        this.initialized = true;
        console.log('HSM authdata available');
    }

    providerSubscribe(appid, requests, action)
    {
        if(action === 'subs' || action === 'start')
            this.provider.subscribeScrips(requests);
        else
            this.provider.unsubscribeScrips(requests);
    }

    buildRequests(appid, list) 
    {
        const requests = [];
        list.forEach((e) => {

            const exchange = e.exchange === 'MCX' ? 'mcx_fo' : e.key === 'index' ? 'nse_cm' : 'nse_fo';    
            const mcx_no_index = e.key === 'index' && e.exchange === 'MCX'; 
            const token = e.key === 'index' && !mcx_no_index ? '26000' : scripstore.findScripByRefKey(e.symbol)?.token;
            if (token === '26000' && this.symbol_cache.get(token) === undefined)
                this.symbol_cache.set(token, utils.expandSymbol(e.symbol));

            if(exchange !== undefined && token !== undefined && !mcx_no_index)
                requests.push(exchange + '|' + token);
        });
        return requests;
    }

    onSnapshot(snapshot)
    {
        const qt = this.toScrip(snapshot);
        this.emitQuotes(qt);

        if (qt.key === 'futures')
            this.atmReview(qt);
    }

    standardize(q)
    {
        const qt = this.symbol_cache.get(q.tk);
        if (qt !== undefined && q.ltp !== undefined) {
            qt.ltp = q.name === 'sf' ? Number(q.ltp) : Number(q.iv);
            qt.ltt = q.m1;
            return qt;
        }
    }

    toScrip(snapshot)
    {
        let qt;
        if(snapshot.name === 'sf') {
            const { tk: token, e: exchange, ltp: ltp, ...rest } = snapshot;
            qt = { token, exchange, ltp};    
            qt.symbol = snapshot.e === 'mcx_fo' ? snapshot.ts : scripstore.findScripByKey('token', snapshot.tk)?.scripReferenceKey;
            qt.ltt = snapshot.fdtm !== undefined ? parse(snapshot.fdtm, pattern, new Date()).getTime() : Date.now();
        }
        else if (snapshot.name === 'if') {
            const { tk: token, e: exchange, iv: ltp,  ...rest } = snapshot;
            qt = { token, exchange, ltp};
            qt.symbol = scripstore.findScripByKey('token', snapshot.tk)?.scripReferenceKey ?? snapshot.tk;
            qt.ltt = snapshot.tvalue !== undefined ? parse(snapshot.tvalue, pattern, new Date()).getTime() : Date.now();
        }
        qt.ltp = Number(qt.ltp);
        this.symbol_cache.set(snapshot.tk, { ...qt, ...utils.expandSymbol(qt.symbol) });
    
        return this.symbol_cache.get(snapshot.tk);
    }
}

export const m_kotak_live = new KotakMarketDataLive('KOTAKLIVEVIEW', undefined);