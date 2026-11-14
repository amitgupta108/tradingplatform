import { EXCHANGES, STRIKE_SIZE, OPT_CONFIG } from '../../utils/constants.js';
import { ConfigService } from '../config/configservice.mjs';

export class Subscriptions {
    constructor(owner) {
        this.owner = owner;
        this.subs_map = new Map();
        this.req_map = new SubscribersMap();
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
    }

    addNewSubscriptions(appid, session) {
        let subs = this.getSubscriptions(appid);
        if (subs === undefined) {
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

    getSubscribers(symbol, active) {
        const subscribers = this.req_map.getSubscribers(symbol);
        return (!active) ? subscribers :
            subscribers.filter((appid) => {
                return this.getSubscriptions(appid)?.toStream;
            });
    }

    pauseStream(appid) {
        this.getSubscriptions(appid).pause(true);
    }

    resumeStream(appid) {
        this.getSubscriptions(appid).pause(false);
    }

    autoUnsub(obj_count) {
        const list = this.getFullSubsList();
        for (const [k, v] of list) {
            this.removeRequests(v.unsub(obj_count.count));
        }
    }
}

export class SubscribersMap {
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

    removeRequests(appid) {
        const unsub_list = [];
        this.req_map.keys().forEach((symbol) => {
            const subscribers = this.req_map.get(symbol);
            const idx = subscribers.findIndex((v) => v === appid);
            if (idx !== -1) {
                subscribers.splice(idx, 1);
                if (subscribers.length === 0)
                    unsub_list.push({ symbol: symbol });
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

export class SubsTemplate {
    constructor(appid, session) {
        this.appid = appid;
        this.toStream = true;
        this.stockCode = session.stockCode;
        this.exchange = EXCHANGES[session.stockCode];
        this.fExpiry = session.fExpiry ?? ConfigService.getServiceByName('CONFIGURATIONS').futexpiries[this.stockCode][0];
        this.atm_check_counter = -1;
        this.atm = 0;
        this.st = [
            {
                key: 'futures', stockCode: this.stockCode, toStream: true, expiry: this.fExpiry,
                symbol: this.stockCode.concat(this.fExpiry).concat('FUT'), exchange: this.exchange
            }
        ];

        session.oExpiries.forEach((expiry, index) => {
            this.st.push({ key: 'optionchain', stockCode: this.stockCode, toStream: true, expiry: expiry, index: index, strikes: [] });
        });
    }

    pause(toPause) {
        this.toStream = !toPause;
    }

    getSubsItems(keys) {
        return this.st.filter((st) => {
            if (this.stockCode === 'CRUDEOIL' && st.key === 'index')
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

    /** deprecated */
    option_chain(expiry, action) {
        const ost = this.getOptionChainByExpiry(expiry);
        if (ost !== -1) {
            if (ost.toStream === false && ['start', 'toggle'].includes(action)) {
                ost.toStream = true;
                if (this.atm !== 0) {
                    const strikes = this.buildOptionChain({ ltp: this.atm }, expiry);
                    return { status: 'success', action: 'subs', strikes: strikes };
                }
            }
            else if (ost.toStream === true && action === 'toggle') {
                ost.toStream = false;
                return { status: 'success', action: 'unsub', strikes: ost.strikes }
            }
        }
    }

    optionChain(expiry, action) {

        let response;
        if (action.key === 'stream')
            response = this.streamOptionChain(expiry, action.value);
        else if (action.key === 'subscribe')
            response = this.subscribeOptionChain(expiry, action.value);

        response.action = action;
        return response;
    }

    streamOptionChain(expiry, action) {
        if (action === 'toggle')
            action = this.toStream ? 'stop' : 'start';

        const ost = this.getOptionChainByExpiry(expiry);
        if (ost !== -1)
            if (action === 'start' ? ost.toStream = true : ost.toStream = false);

        return { status: 'success', strikes: ost.strikes };
    }

    subscribeOptionChain(expiry, action) {
        if (action === 'start' && this.atm !== 0) {
            const strikes = this.buildOptionChain({ ltp: this.atm }, expiry);
            return { status: 'success', strikes: strikes };
        }
        else if (action === 'stop') {
            const ost = this.getOptionChainByExpiry(expiry);
            return { status: 'success', strikes: ost.strikes };
        }
    }

    buildOptionChain(uq, expiry) {
        const ost = this.getOptionChainByExpiry(expiry);
        const config = ost.index === 0 ? OPT_CONFIG['FIRST'] : OPT_CONFIG['SECOND'];
        const st_prices = this.strikes(uq.ltp, config.start, config.end, STRIKE_SIZE[this.stockCode]);

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

    reloadStrikes(uq) {
        const strikesset = [];
        const osts = this.getActiveOptionChains();
        osts.forEach((ost) => {
            strikesset.push(this.buildOptionChain(uq, ost.expiry));
        });

        return strikesset;
    }

    getActiveOptionChains() {
        return this.st.filter((s) =>
            s.key === 'optionchain'
            && s.toStream === true);
    }

    getRequestsByProperties(options) {
        //toStream
    }

    getNotified(uq) {
        const sz = STRIKE_SIZE[this.stockCode];
        this.atm_check_counter++;

        if (this.atm_check_counter === 30) {
            this.atm_check_counter = 1;
            if (Math.abs(this.atm - uq.ltp) > sz) {
                this.atm = Math.round(uq.ltp / sz) * sz;
                return { load: true, uq: uq }
            }
        }
        else if (this.atm_check_counter === 0) {
            this.atm = Math.round(uq.ltp / sz) * sz;
            return { load: true, uq: uq };
        }
    }

    unsub(count) {
        const osts = this.getActiveOptionChains();
        const unsub_strikes = [];
        for (const ost of osts) {
            const unsub_list = ost.strikes?.filter((s) => {
                Math.abs((s.strike - this.atm) > count * STRIKE_SIZE[this.stockCode])
            });

            unsub_strikes.concat(unsub_list);
        }
        return unsub_strikes;
    }

    strikes(price, startIdx = 2, endIdx = 7, sz) {
        const atmIdx = Math.round(price / sz);
        const idxs = endIdx - startIdx;
        var strikes = new Array(idxs * 2);

        for (var j = startIdx; j <= endIdx; j++) {
            strikes[j - startIdx] = { strike: (atmIdx - j) * sz, right: 'PE' };
            strikes[j + idxs - startIdx + 1] = { strike: (atmIdx + j) * sz, right: 'CE' };
        }
        return strikes;
    }
}