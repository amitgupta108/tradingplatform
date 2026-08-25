import {scripstore} from '../service/scripstore.mjs';
import { eventservice } from '../service/eventservice.mjs';
import { HSMClient } from '../../dist/marketdatafeed/websocket/HSMClient.js'
import { BrokerMarketDataImpl } from './m_broker_interface.mjs';
import utils from '../../common/utils.mjs';

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
    }

    addListeners()
    {
        if (!this.provider)
            this.provider = new HSMClient(options);

        this.provider.addListener('quote', this.onQuotes);
        this.provider.addListener('snapshot', this.onSnapshot);
        eventservice.addListener('kotak_auth', this.onAuthdata);
    }

    onAuthdata(authdata)
    {
        this.authData = authdata;
        this.provider.initiateConnect(this.authData);
        this.initialized = true;
        console.log('HSM authdata available');
    }

    providerStart(appid, requests)
    {
        this.buildRequests(appid, requests)
        this.my_subs.addRequests(requests);
        this.subscribe(appid, requests, 'subs');
    }

    buildRequests(appid, list) 
    {
        const requests = [];
        list.forEach((e) => {
            const exchange = e.exchange === 'MCX' ? 'mcx_fo' : e.key === 'index' ? 'nse_cm' : 'nse_fo';    
            const mcx_no_index = e.key === 'index' && e.exchange === 'MCX'; 
            const token = e.key === 'index' && !mcx_no_index ? '26000' : scripstore.findScripByRefKey(e.symbol)?.token;
            
            if(exchange !== undefined && token !== undefined && !mcx_no_index)
                requests.push(exchange + '|' + token);
        });
        return requests;
    }

    option_chain(appid, stockCode, expiry, action) {
        const stock_subs = my_subs.getSubscriptions(stockCode + 'LIVE_1');
        const response = stock_subs.optionChainAction(expiry, action);
        if (response !== undefined) {
            subscribe(appid, response.strikes, response.action);
        }
    }

    onSnapshot(response)
    {
        const qt = this.toScrip(response);
        this.emitQuotes(qt);

        if (qt.key === 'index' || (qt.exchange === 'MCX' && qt.key === 'futures'))
            this.atmReview(qt);
    }

    standardize(q)
    {
        const qt = this.symbol_cache.get(q.tk);
        if (qt !== undefined) {
            if (q.name === 'sf' && q.ltp !== undefined) {
                qt.ltp = Number(q.ltp);
                qt.ltt = q.m1 - qt.offset;
                return qt;
            }
            else if(q.name === 'if' && q.iv !== undefined) {
                qt.ltp = Number(q.iv);
                qt.ltt = q.m1 - qt.offset;
                return qt;
            }
        }
    }

    toScrip(snapshot)
    {
        const qt = this.symbol_cache.get(snapshot.tk);
        if (qt === undefined)
        {
            if(snapshot.name === 'sf') {
                const fdtm = snapshot.fdtm !== undefined ? parse(snapshot.fdtm, pattern, new Date()).getTime() : Date.now() ;
                const { e: exchange, ts: tSymbol, ltp: ltp, ...rest } = snapshot;
                const qt = { exchange, tSymbol, ltp};
    
                qt.symbol = snapshot.e === 'nse_fo' ? scripstore.findScripByKey('token', snapshot.tk)?.scripReferenceKey : snapshot.ts;
                qt.ltp = Number(qt.ltp);
                qt.ltt = fdtm;
                qt.offset = Date.now() - fdtm;
                this.symbol_cache.set(snapshot.tk, { ...qt, ...utils.expandSymbol(qt.symbol) });
            }
            else if (snapshot.name === 'if') {
                const tvalue = snapshot.tvalue !== undefined ? parse(snapshot.tvalue, pattern, new Date()).getTime() : Date.now();
                const { tk: token, e: exchange, iv: ltp,  ...rest } = snapshot;
                const qt = { token, exchange, ltp};
    
                qt.symbol = snapshot.tk;
                qt.ltp = Number(qt.ltp);
                qt.ltt = tvalue;
                qt.offset = Date.now() - tvalue;
                this.symbol_cache.set(snapshot.tk, { ...qt, ...utils.expandSymbol(qt.symbol) });
            }
        }
        return this.symbol_cache.get(snapshot.tk);
    }
}

export const m_kotak_live = new KotakMarketDataLive('KOTAKLIVEVIEW', undefined);