import {OPT_EXPIRIES, FUT_EXPIRIES, STRIKE_SIZE} from '../../common/constants.mjs';
import utils from '../../common/utils.mjs';

export class Subscriptions {
    constructor(provider) {
        this.provider = provider;
        this.subs_map = new Map();
        subs_store_all[provider] = this;
    }

    addNewSubscriptions(stockCode) {
        const stock_subs = new SubsTemplate(stockCode);
        this.subs_map.set(stockCode, stock_subs);
        return stock_subs;
    }

    removeSubscriptions(stockCode) {
        const idx = this.subs_list.findIndex((s) => s.stockCode === stockCode);
        this.subs_list.slice(idx);
    }

    getSubscriptions(stockCode) {
        return this.subs_map.get(stockCode);
    }
}

export class SubsTemplate
{
    constructor(stockCode)
    {
        this.stockCode = stockCode;
        this.st = [
            { key: 'index', stockCode: stockCode, toStream: true },
            { key: 'futures', stockCode: stockCode, toStream: true },
            { key: 'ocfirst', stockCode: stockCode, toStream: true, near: 'FIRST'},
        ];

        for (var i = 0; i < 3; i++) {
            this.st[i].exchange = this.stockCode === 'CRUDEOIL' ? 'MCX' : this.st[i].key === 'index' ? 'NSE' : 'NFO';
            //this.st[i].model = this.mode.startsWith('HISTORY') ? 'history' : 'LIVE';
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

    buildOptionChain(uq, st)
    {
        const oc_config = OPT_EXPIRIES[this.stockCode][st.near];
        const st_prices = utils._strikes(uq.ltp, oc_config.startIdx, oc_config.endIdx, STRIKE_SIZE[this.stockCode]);
        const strikes = st_prices.map((s) => {
            s.exchange = uq.exchange;
            s.expiry = oc_config.date;
            s.key = 'strikex';
            s.symbol = uq.stockCode + oc_config.date + s.strike + s.right;
            return s;
        });

        const oc = this.st.find((s) => s.key === st.key);
        oc.strikes = strikes;
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
