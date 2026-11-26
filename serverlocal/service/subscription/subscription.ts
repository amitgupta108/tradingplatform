import { Generic } from '../../../common/generic.js';
import { EXCHANGES, STOCKCODES, STRIKE_SIZE, OPT_CONFIG } from '../../utils/constants.js';
import { ConfigService } from '../config/configservice.mjs';
import type { Quote } from '../../utils/types.js';
import { EventService } from '../system/eventservice.js';

export interface SubsItem {
    key: 'index' | 'futures' | 'vix' | 'optionchain' | 'strikex',
    symbol: string,
    toStream?: boolean,
    expiry?: string,
    index?: number,
    strikes?: any[]
}

export class Subscriptions extends Generic {
    provider: string;
    subs_map: Map<string, SubsTemplate>;
    req_map: SubscribersMap;
    es: EventService;

    constructor(provider: string) {
        super(`SUBS_${provider}`);
        this.provider = provider;
        this.subs_map = new Map();
        this.req_map = new SubscribersMap();
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
    }

    addNewSubscriptions(appid: string, session: any) {
        let subs = this.getSubscriptions(appid);
        if (subs === undefined) {
            subs = new SubsTemplate(appid, session);
            this.subs_map.set(appid, subs);
        }
        return subs;
    }

    removeSubscriptions(appid: string) {
        this.subs_map.delete(appid);
    }

    getSubscriptions(appid: string) {
        return this.subs_map.get(appid);
    }

    getSubscriptionsForStockCode(stockCode: string) {
        return Array.from(this.subs_map.values()).filter((t: SubsTemplate) => {
            return t.stockCode === stockCode;
        });
    }

    getFullSubsList() {
        return this.subs_map.entries();
    }

    addRequests(appid: string, requests: any[]) {
        this.req_map.addRequests(appid, requests);
    }

    removeRequests(appid: string) {
        const unsub_list = this.req_map.removeRequests(appid);
        this.es.emit(`${this.provider}_unsub`, appid, unsub_list);
    }

    getSubscribers(symbol: string, active: boolean) {
        const subscribers = this.req_map.getSubscribers(symbol) as string[];
        return (!active) ? subscribers :
            subscribers.filter((appid: string) => {
                return this.getSubscriptions(appid)?.toStream;
            });
    }

    pauseStream(appid: string) {
        (this.getSubscriptions(appid) as SubsTemplate).pause(true);
    }

    resumeStream(appid: string) {
        (this.getSubscriptions(appid) as SubsTemplate).pause(false);
    }

    autoUnsub(obj_count: { count: number }) {
        const list = this.getFullSubsList();
        for (const [k, v] of list) {
            this.removeRequests(v.unsub(obj_count.count) as any);
        }
    }
}

export class SubscribersMap {
    req_map: Map<string, string[]>;
    constructor() {
        this.req_map = new Map();
    }

    addRequests(appid: string, requests: any[]) {
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

    removeRequests(appid: string) {
        const unsub_list: any[] = [];
        Array.from(this.req_map.keys()).forEach((symbol: string) => {
            const subscribers = this.req_map.get(symbol) as string[];
            const idx = subscribers.findIndex((v: string) => v === appid);
            if (idx !== -1) {
                subscribers.splice(idx, 1);
                if (subscribers.length === 0)
                    unsub_list.push({ symbol: symbol });
            }
        });
        return unsub_list;
    }

    getSubscribers(symbol: string): string[] {
        return this.req_map.get(symbol) || [];
    }

    getRequests(appid: string): string[] {
        return Array.from(this.req_map.keys()).filter((k: string) => {
            return this.req_map.get(k)!.includes(appid);
        });
    }
}

export class SubsTemplate {
    appid: string;
    toStream: boolean;
    stockCode: string;
    fExpiry: string;
    atm_check_counter: number;
    atm: number;
    st: SubsItem[];

    constructor(appid: string, session: any) {
        this.appid = appid;
        this.toStream = true;
        this.stockCode = session.stockCode;
        this.fExpiry = session.fExpiry;
        this.atm_check_counter = -1;
        this.atm = 0;
        this.st = [{
            key: 'futures', toStream: true, expiry: this.fExpiry, symbol: this.stockCode.concat(this.fExpiry).concat('FUT')
        }];

        session.oExpiries.forEach((expiry: string, index: number) => {
            this.st.push({ key: 'optionchain', symbol: this.stockCode, toStream: true, expiry: expiry, index: index, strikes: [] });
        });
    }

    pause(toPause: boolean): void {
        this.toStream = !toPause;
    }

    getSubsItems(keys: string[]): SubsItem[] {
        return this.st.filter((st: SubsItem) => {
            return keys.includes(st.key);
        });
    }

    getSubsItemByKey(key: string): SubsItem | undefined {
        return this.st.find((s) => s.key === key);
    }

    getOptionChainByExpiry(expiry: string): SubsItem | undefined {
        return this.st.find((s) => {
            return s.key === 'optionchain'
                && s.expiry === expiry;
        });
    }

    /** deprecated */
    option_chain(expiry: string, action: string) {
        const ost = this.getOptionChainByExpiry(expiry);
        if (ost !== undefined) {
            if (ost.toStream === false && ['start', 'toggle'].includes(action)) {
                ost.toStream = true;
                if (this.atm !== 0) {
                    const strikes = this.buildOptionChain(this.atm, expiry);
                    return { status: 'success', action: 'subs', strikes: strikes };
                }
            }
            else if (ost.toStream === true && action === 'toggle') {
                ost.toStream = false;
                return { status: 'success', action: 'unsub', strikes: ost.strikes }
            }
        }
    }

    optionChainAction(expiry: string, action: any) {

        let response;
        if (action.key === 'stream')
            response = this.streamOptionChain(expiry, action.value);
        else if (action.key === 'subscribe')
            response = this.subscribeOptionChain(expiry, action.value);
        else if (action.key === 'strikes')
            response = this.modifyStrikes(expiry, action.value);

        response.action = action;
        return response;
    }

    streamOptionChain(expiry: string, action: any) {
        if (action.value === 'toggle')
            action.value = this.toStream ? 'stop' : 'start';

        const ost = this.getOptionChainByExpiry(expiry) as SubsItem;
        ost.toStream = (action.value === 'start');

        return { status: 'success', strikes: ost.strikes };
    }

    subscribeOptionChain(expiry: string, action: string) {
        if (action === 'start' && this.atm !== 0) {
            const strikes = this.buildOptionChain(this.atm, expiry);
            return { status: 'success', strikes: strikes };
        }
        else if (action === 'stop') {
            const ost = this.getOptionChainByExpiry(expiry) as SubsItem;
            return { status: 'success', strikes: ost.strikes };
        }
    }

    modifyStrikes(expiry: string, range: any) {
        const ost = this.getOptionChainByExpiry(expiry) as SubsItem;
        const currentstrikes = ost.strikes;
        ost.strikes = this.buildRequests(this.atm, expiry, range.startIdx, range.endIdx);

        return { status: 'success', strikes: ost.strikes, oldstrikes: currentstrikes };
    }

    reloadStrikes(atm: number) {
        const strikesset: string[] = [];
        const osts = this.getActiveOptionChains();
        osts.forEach((ost: any) => {
            strikesset.push(this.buildOptionChain(atm, ost.expiry));
        });

        return strikesset;
    }

    getActiveOptionChains() {
        return this.st.filter((s) =>
            s.key === 'optionchain'
            && s.toStream === true);
    }

    getNotified(uq: Quote) {
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

    unsub(count: number): any[] {
        const osts = this.getActiveOptionChains();
        const unsub_strikes: any[] = [];
        for (const ost of osts) {
            const unsub_list = ost.strikes?.filter((s: any) => {
                return Math.abs(Number(s.strike) - this.atm) > count * STRIKE_SIZE[this.stockCode];
            });
            unsub_strikes.concat(unsub_list);
        }
        return unsub_strikes;
    }

    private buildOptionChain(price: number, expiry: string): any {
        const ost = this.getOptionChainByExpiry(expiry) as SubsItem;
        const config = ost.index === 0 ? OPT_CONFIG['FIRST'] : OPT_CONFIG['SECOND'];

        ost.strikes = this.buildRequests(price, expiry, config.start, config.end);
        return ost.strikes;
    }

    private buildRequests(price: number, expiry: string, startIdx: number, endIdx: number) {
        const st_prices = this.strikes(price, startIdx, endIdx, STRIKE_SIZE[this.stockCode]);

        return st_prices.map((s: any) => {
            return {
                expiry: s.expiry,
                key: 'strikex',
                symbol: this.stockCode + expiry + s.strike + s.right
            } as SubsItem;
        });
    }

    private strikes(price: number, startIdx = 2, endIdx = 7, sz: number): any[] {
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