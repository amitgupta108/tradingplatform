import {OPT_EXPIRIES, FUT_EXPIRIES, STRIKE_SIZE, OPT_CONFIG} from '../../common/constants.mjs';
import utils from '../../common/utils.mjs';

export const socketmap = new Map();
export const us = new Map();

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
        let subs = this.subs_map.get(appid);
        if(subs === undefined) {
            subs = new SubsTemplate(session);
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
    constructor(session)
    {
        this.stockCode = session.stockCode;
        this.atm = 0;
        this.st = [
            { key: 'index', stockCode: this.stockCode, toStream: true },
            { key: 'futures', stockCode: this.stockCode, toStream: true },
            { key: 'ocfirst', stockCode: this.stockCode, toStream: true, near: 'FIRST'},
        ];
        this.fExpiry = session.fExpiry ?? FUT_EXPIRIES[this.stockCode]['FIRST'];
        this.oExpiries = session.oExpiries ?? [OPT_EXPIRIES[this.stockCode]['FIRST']];

        for (var i = 0; i < 3; i++) {
            this.st[i].exchange = this.stockCode === 'CRUDEOIL' ? 'MCX' : this.st[i].key === 'index' ? 'NSE' : 'NFO';
            this.st[i].symbol = i === 1 ? this.stockCode.concat(this.fExpiry).concat('FUT') : this.st[i].stockCode;
            this.st[i].toStream = i === 0 && this.st[i].exchange === 'MCX' ? false : true;
            if (i != 0)
                this.st[i].expiry = i === 1 ? this.fExpiry : this.oExpiries.at(0);
        }
    }

    addOptionChain(){

    }

    removeOptionChain(expiry) {

    }

    getSubsItemsByKey(keys) {
        return this.st.filter((s) => keys.includes(s.key));
    }

    getRequestsByOptionsExpiry(expiry) {

    }

    getPreviousATM(near)
    {
        const oc_config = OPT_CONFIG['FIVE'];
        const ost_first = this.getSubsItemsByKey('ocfirst')[0];
        const strikes = ost_first.strikes;
        if(strikes !== undefined){
            const diff = oc_config.endIdx - oc_config.startIdx;
            const min_put = strikes[diff];
            const max_call = strikes[2 * diff + 1];
            return (min_put.strike + max_call.strike) / 2;
        }
        return 0;
    }

    buildOptionChain(uq, ost)
    {
        const idx = ost.near === 'FIRST' ? 0 : 1;
        const oc_config = OPT_CONFIG['FIVE'];
        const st_prices = utils._strikes(uq.ltp, oc_config.startIdx, oc_config.endIdx, STRIKE_SIZE[this.stockCode]);
        const strikes = st_prices.map((s) => {
            s.exchange = uq.exchange.startsWith('NSE') ? 'NFO' : uq.exchange;
            s.expiry = this.oExpiries[idx];
            s.key = 'strikex';
            s.stockCode = uq.stockCode;
            s.symbol = uq.stockCode + this.oExpiries[idx] + s.strike + s.right;
            return s;
        });

        ost.strikes = strikes;
        return strikes;
    }

    getActiveOptionChains()
    {  
        return this.st.filter((s) => 
            s.key.startsWith('oc')
            && s.toStream === true);
    }

    getRequestsByProperties(options) {
        //toStream
    }
}

export const subs_store_all = {
    ICICIHISTVIEW: {},
    OPENALGOVIEW: {},
    KOTAKNEOVIEW: {},
    ICICILIVEVIEW: {},
}
