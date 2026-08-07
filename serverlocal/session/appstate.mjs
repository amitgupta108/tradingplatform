import {OPT_EXPIRIES, FUT_EXPIRIES, STRIKE_SIZE, OPT_CONFIG} from '../../common/constants.mjs';
import utils from '../../common/utils.mjs';
import { eventservice } from '../service/eventservice.mjs';
export const socketmap = new Map();
export const uwsmap = new Map();
export const us = new Map();

export const state_kotakneo = {
    authData: {},
    endpoints: {
        order: '/quick/order/rule/ms/place',
        orderbook: '/quick/user/orders',
        cancel: '/quick/order/cancel',
        positions: '/quick/user/positions'
    },
    oTemplate: {
        am: 'NO',
        dq: '0',
        mp: '6',
        pf: 'N',
        rt: 'DAY',
        tp: '0',
    }
};

export const state_kotakhsm = {

}

export const state_qutils = {
    quote_cache: new Map()
}

export class ScripAppMap
{
    constructor(){
        this.mapping = new Map();
    }

    add(symbol, appid) {
        const app_list = this.mapping.get(symbol);
        if (app_list === undefined)
            this.mapping.set(symbol, [appid]);
        
        app_list.push(appid);
    }

    remove (symbol, appid) {

    }
}

export class Subscriptions {
    constructor(provider) {
        this.provider = provider;
        this.subs_map = new Map();
        subs_store_all[provider] = this;
    }

    addNewSubscriptions(appid, session) {
        let subs = this.getSubscriptions(appid);
        if(subs === undefined) {
            subs = new SubsTemplate(appid, session);
            this.subs_map.set(appid, subs);
        }        
        return subs;
    }

    removeSubscriptions(appid) {
        this.subs_map.delete(appid);
    }

    getSubscriptions(appid) {
        return this.subs_map.get(appid);
    }

    getSubscriptionsForStockCode(stockCode) {
        return this.subs_map.values().filter((t) => 
            t.stockCode === stockCode);
    }

    getFullSubsList(){
        return this.subs_map.entries();
    }
}

export class SubsTemplate
{
    constructor(appid, session)
    {
        this.appid = appid;
        this.stockCode = session.stockCode;
        this.exchange = session.exchange;
        this.atm_check_counter = 0;
        this.atm = 0;
        this.st = [
            { key: 'index', stockCode: this.stockCode, toStream: true },
            { key: 'futures', stockCode: this.stockCode, toStream: true },
        ];

        this.fExpiry = session.fExpiry ?? FUT_EXPIRIES[this.stockCode]['FIRST'];
        this.oExpiries = session.oExpiries ?? [OPT_EXPIRIES[this.stockCode]['FIRST']];

        for (var i = 0; i < 2; i++) {
            this.st[i].exchange = this.st[i].key === 'index' && this.exchange === 'NFO' ? 'NSE' : this.exchange;
            this.st[i].symbol = i === 1 ? this.stockCode.concat(this.fExpiry).concat('FUT') : this.st[i].stockCode;
            this.st[i].toStream = i === 0 && this.st[i].exchange === 'MCX' ? false : true;
            if (i === 1)
                this.st[i].expiry = this.fExpiry;
        }

        this.oExpiries.forEach((expiry) => 
        {
            const idx = this.st.findIndex((s) => s.key === 'optionchain' && s.expiry === expiry);
            if(idx === -1)
                this.st.push({key: 'optionchain', stockCode: this.stockCode, toStream: true, expiry: expiry});
        });
    }

    getSubsItems(keys)
    {
        return this.st.filter((s) => keys.includes(s.key));
    }
    
    getSubsItemByKey(key) {
        return this.st.find((s) => s.key === key);
    }

    getOptionChainByExpiry(expiry) {
        return this.st.find((s) => {
            return s.key === 'optionchain' 
            && s.expiry === expiry;
        });
    }

    optionChainAction(expiry, action)
    {
        const ost = this.getOptionChainByExpiry(expiry);
        if(ost !== -1)
        {
            if(ost.toStream === false && ['start', 'toggle'].includes(action)){
                ost.toStream = true;
                if(this.atm !== 0) {
                    const strikes = this.buildOptionChain({ ltp: this.atm }, expiry);
                    return { action: 'subs', strikes: strikes };
                    //eventservice.emit('subscription', this.appid, strikes, 'subs');
                }
            } 
            else if (ost.toStream === true && action === 'toggle') {
                ost.toStream = false;
                return { action: 'unsub', strikes: ost.strikes }
                //eventservice.emit('subscription', this.appid, ost.strikes, 'unsub');
            }
        }
    }

    buildOptionChain(uq, expiry)
    {
        const ost = this.getOptionChainByExpiry(expiry);
        const oc_config = OPT_CONFIG['SIX'];
        const st_prices = utils._strikes(uq.ltp, oc_config.startIdx, oc_config.endIdx, STRIKE_SIZE[this.stockCode]);
        
        const strikes = st_prices.map((s) => {
            s.exchange = this.exchange;
            s.expiry = expiry,
            s.key = 'strikex';
            s.stockCode = this.stockCode;
            s.symbol = this.stockCode + expiry + s.strike + s.right;
            return s;
        });

        ost.strikes = strikes;
        return strikes;
    }

    reloadStrikes(uq)
    {
        const strikesset = [];     
        const osts = this.getActiveOptionChains();
        osts.forEach((ost) => {
            strikesset.push(this.buildOptionChain(uq, ost.expiry));
        });

        return strikesset;
    }

    getActiveOptionChains()
    {  
        return this.st.filter((s) => 
            s.key === 'optionchain'
            && s.toStream === true);
    }

    getRequestsByProperties(options) {
        //toStream
    }

    getNotified(uq)
    {
        const sz = STRIKE_SIZE[this.stockCode];
        this.atm_check_counter++;
        
        if (this.atm_check_counter === 15) {
            this.atm_check_counter = 1;
            if (Math.abs(this.atm - uq.ltp) > sz) {
                this.atm = Math.round(uq.ltp / sz) * sz;
                return { load: true, uq: uq }
            }
        }
        else if(this.atm_check_counter === 0) {
            this.atm = Math.round(uq.ltp / sz) * sz;
            return { load: true, uq: uq };
        }
    }
}

export const subs_store_all = {
    ICICIHISTVIEW: {},
    OPENALGOVIEW: {},
    KOTAKHSMVIEW: {},
    ICICILIVEVIEW: {},
}
