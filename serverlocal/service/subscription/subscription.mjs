import { EXCHANGES, FUT_EXPIRIES, STRIKE_SIZE, OPT_CONFIG } from '../../utils/constants.mjs';
import utils from '../../../common/utils.mjs';
import { ConfigService } from '../.config/configservice.mjs';

export class Subscriptions 
{
    constructor(owner) 
    {
        this.owner = owner;
        this.subs_map = new Map();
        this.req_map = new SubscribersMap();
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
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

    getFullSubsList() {
            return this.subs_map.entries();
    }

    addRequests(appid, requests) {
        this.req_map.addRequests(appid, requests);
    }

    removeRequests(appid) {
        const unsub_list = this.req_map.removeRequests(appid);
        this.es.emit(`${this.owner}_unsub`, appid, unsub_list);
    }

    getSubscribers(symbol, active) 
    {
        const subscribers = this.req_map.getSubscribers(symbol);
        return (!active) ? subscribers :
            subscribers.filter((appid) => {
                return this.getSubscriptions(appid)?.toStream;
        });
    }

    pauseStream(appid){
        this.getSubscriptions(appid).pause(true);
    }

    resumeStream(appid) {
        this.getSubscriptions(appid).pause(false);
    }

    autoUnsub(obj_count) {
        const list = this.getFullSubsList();
        for( const l of list) {
            this.removeRequests(l.unsub(obj_count.count));
        }
    }
}

export class SubscribersMap
{
    constructor() {
        this.req_map = new Map();
    }

    addRequests(appid, requests) {
        requests.forEach((r) => {
            let subscribers = this.req_map.get(r.symbol);
            if (subscribers === undefined) {
                subscribers = new Array();
                this.req_map.set(r.symbol, subscribers);
            }
            if (!subscribers.includes(appid))
                subscribers.push(appid);
        });
    }

    removeRequests(appid) 
    {
        const unsub_list = [];
        this.req_map.keys().forEach((symbol) => {
            const subscribers = this.req_map.get(symbol);
            const idx = subscribers.findIndex((v) => v === appid);
            if(idx !== -1) {
                subscribers.splice(idx, 1);
                if(subscribers.length === 0)
                    unsub_list.push({symbol: symbol});
            }
        });
        return unsub_list;
    }

    getSubscribers(symbol) {
        return this.req_map.get(symbol);
    }

    getRequests(appid) {
        return Array.from(this.req_map.keys()).filter((k) => {
            return this.req_map.get(k).includes(appid);
        });
    }
}

export class SubsTemplate
{
    constructor(appid, session)
    {
        this.appid = appid;
        this.toStream = true;
        this.stockCode = session.stockCode;
        this.exchange = EXCHANGES[session.stockCode];
        this.fExpiry = session.fExpiry ?? FUT_EXPIRIES[this.stockCode]['FIRST'];
        this.atm_check_counter = -1;
        this.atm = 0;
        this.st = [
            { key: 'index', stockCode: this.stockCode, toStream: true, symbol: this.stockCode, exchange: 'nse_cm'},
            { key: 'futures', stockCode: this.stockCode, toStream: true, expiry: this.fExpiry,
                symbol: this.stockCode.concat(this.fExpiry).concat('FUT'), exchange: this.exchange
            }
        ];

        session.oExpiries.forEach((expiry) => 
        {
            const idx = this.st.findIndex((s) => s.key === 'optionchain' && s.expiry === expiry);
            if(idx === -1)
                this.st.push({key: 'optionchain', stockCode: this.stockCode, toStream: true, expiry: expiry});
        });
    }

    pause(toPause)
    {
        this.toStream = !toPause;
    }

    getSubsItems(keys)
    {
        return this.st.filter((st) => {
            if(this.stockCode === 'CRUDEOIL' && st.key === 'index')    
                return false;
            else
                return keys.includes(st.key);
        });
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

    unsub(count)
    {
        const osts = this.getActiveOptionChains();
        const unsub_strikes = [];
        for(const ost of osts) {
            const unsub_list = ost.strikes.filter((s) => {
                Math.abs((s.strike - this.atm) > count * STRIKE_SIZE[this.stockCode])
           });

           unsub_strikes.concat(unsub_list);
        }
        return unsub_strikes;
    }
}