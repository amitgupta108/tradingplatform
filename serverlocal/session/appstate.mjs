import {OPT_EXPIRIES, FUT_EXPIRIES, STRIKE_SIZE} from '../../common/constants.mjs';
import utils from '../../common/utils.mjs';

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

    addNewSubscriptions(appid, stockCode) {
        let subs = this.subs_map.get(appid);
        if(subs === undefined) {
            subs = new SubsTemplate(stockCode);
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
    constructor(stockCode)
    {
        this.stockCode = stockCode;
        this.atm = 0;
        this.st = [
            { key: 'index', stockCode: stockCode, toStream: true },
            { key: 'futures', stockCode: stockCode, toStream: true },
            { key: 'ocfirst', stockCode: stockCode, toStream: true, near: 'FIRST'},
        ];

        for (var i = 0; i < 3; i++) {
            this.st[i].exchange = this.stockCode === 'CRUDEOIL' ? 'MCX' : this.st[i].key === 'index' ? 'NSE' : 'NFO';
            this.st[i].symbol = i === 1 ? this.stockCode.concat(FUT_EXPIRIES[this.stockCode].FIRST).concat('FUT') : this.st[i].stockCode;
            this.st[i].toStream = i === 0 && this.st[i].exchange === 'MCX' ? false : true;
            if (i != 0)
                this.st[i].expiry = i === 1 ? FUT_EXPIRIES[this.stockCode]['FIRST'] : OPT_EXPIRIES[this.stockCode]['FIRST'];
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
        const oc_config = OPT_EXPIRIES[this.stockCode][near];
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
        const oc_config = OPT_EXPIRIES[this.stockCode][ost.near];
        const st_prices = utils._strikes(uq.ltp, oc_config.startIdx, oc_config.endIdx, STRIKE_SIZE[this.stockCode]);
        const strikes = st_prices.map((s) => {
            s.exchange = uq.exchange;
            s.expiry = oc_config.date;
            s.key = 'strikex';
            s.symbol = uq.stockCode + oc_config.date + s.strike + s.right;
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
