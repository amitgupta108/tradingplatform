import { streamer } from '../../stream.js';
import { Subscriptions, SubsTemplate } from '../../service/subscription/subscription.js';
import { BrokerService } from '../../service/system/service.js';
import { ConfigService } from '../../service/config/configservice.mjs';
import { OrderManager } from './ordermanager.mjs';
import { toScrip } from '../../utils/constants.js';
import type { Scrip } from '../../utils/types.js';
import type { EventService } from '../../service/system/eventservice.js';
import type { SubsItem } from '../../service/subscription/subscription.js';

class BrokerImpl extends BrokerService {
    adapter?: any;
    symbol_cache: Map<string, any>;
    constructor(name: string) {
        super(name);
        this.symbol_cache = new Map();
    }

    getScrip(symbol: string): Scrip {
        return toScrip(symbol);
    }
}

export abstract class BrokerMarketDataImpl extends BrokerImpl {
    view_mode?: string;
    simpricefeed?: boolean = false;
    subscriptions: Subscriptions;
    es: EventService;

    abstract addListeners(): Promise<boolean>;
    abstract subscribe(appid: string, sc: any[], action: string, ...args: any[]): void;
    abstract subscribeIndices(appid: string, sc: string): void;
    abstract standardize(qt: any): any;

    constructor(name: string) {
        super(name);
        this.subscriptions = new Subscriptions(this.name);
        this.es = ConfigService.getServiceByName('EVENTSERVICE') as EventService;
    }

    async init() {
        if (!this.initialized) {
            this.view_mode = ConfigService.getKeyByFeature(this.name, 'view');

            this.es.addListener(`${this.name}_unsub`, (appid, list) => {
                this.subscribe(appid, list, 'unsub');
            });
            this.es.addListener('oc_unsub', (count) => {
                this.subscriptions.autoUnsub(count);
            });

            await this.addListeners();
            this.initialized = true;
            return { status: 'success' };
        }
        return { status: 'already initialized' };
    }

    startv2(appid: string, p) {
        const stock_subs = this.subscriptions.addNewSubscriptions(appid, p) as SubsTemplate;
        const request = stock_subs.getSubsItemByKey('futures') as SubsItem; //st_item

        this.subscribe(appid, [request.symbol], 'start', p.simStartTime, p.speed ?? 1);
        this.subscribeIndices(appid, p.stockCode);

        if (stock_subs.atm !== 0) {
            const strikesset = stock_subs.reloadStrikes(stock_subs.atm);
            strikesset.forEach((s: any) => {
                this.subscribe(appid, s, 'subs');
            });
        }
    }

    atmReview(qt: any) {
        const t = this.subscriptions.getSubscriptionsForStockCode(qt.stockCode);
        t.forEach((ss) => {
            const response = ss.getNotified(qt);
            if (response !== undefined && response.load === true) {
                const strikesset = ss.reloadStrikes(response.uq.ltp);
                strikesset.forEach((set: any) => {
                    this.subscribe(ss.appid, set, 'subs');
                });
            }
        });
    }

    /** deprecated **/
    option_chain(appid: any, expiry: any, action: any) {
        const stock_subs = this.subscriptions.getSubscriptions(appid) as SubsTemplate;

        const response = stock_subs.option_chain(expiry, action.value);
        if (response !== undefined && response.status === 'success')
            this.subscribe(appid, response.strikes, response.action);
    }

    optionchainAction(appid: string, expiry: string, action: any) {
        const subs = this.subscriptions.getSubscriptions(appid) as SubsTemplate;
        if (subs !== undefined) {
            const response = subs.optionChainAction(expiry, action);
            if (response.status === 'success') {
                if (action.key === 'strikes') {
                    this.subscribe(appid, response.oldstrikes, 'unsub');
                    this.subscribe(appid, response.strikes, 'subs');
                }
                else if (action.key === 'subscribe') {
                    this.subscribe(appid, response.strikes, 'subs');
                }
                else if (action.key === 'stream') {
                    this.log(`optionchainAction: ${action.key} - ${action.value} - success`);
                }
            }
        }
    }

    onQuotes(q: any, appid: string) {
        const qt = this.standardize(q);
        if (qt !== undefined) {
            this.emitQuotes(qt, appid);

            if (qt.key === 'futures')
                this.atmReview(qt);
            else if (this.simpricefeed && qt.key === 'strikex')
                this.es.emit(this.view_mode as string, qt);
        }
    }

    emitQuotes(qt: any, appid?: string) {
        qt.view_mode = this.view_mode;
        if (appid !== undefined) {
            qt.appid = appid;
            streamer.emitQs(qt);
        }
        else {
            const appids = this.subscriptions.getSubscribers(qt.symbol, true);
            appids.forEach((a) => {
                qt.appid = a;
                streamer.emitQs(qt);
            });
        }
    }

    registerPriceFeed() {
        this.simpricefeed = true;
        return this.view_mode;
    }

    stream(appid: string, action: string) {
        if (action === 'pause')
            this.subscriptions.pauseStream(appid);
        else if (action === 'resume')
            this.subscriptions.resumeStream(appid);
    }

    exit(appid: string) {
        this.subscriptions.removeRequests(appid);
        this.subscriptions.removeSubscriptions(appid);
    }
}

export abstract class BrokerTradeServiceImpl extends BrokerImpl {
    trade_mode?: string;
    mytradename: string;
    ordermanager?: OrderManager;

    abstract placeOrder(appid: string, order: any, modify?: boolean): any;
    abstract addListeners(): Promise<boolean>;

    constructor(name: string) {
        super(name);
        this.trade_mode;
        this.mytradename = name;
        this.ordermanager = ConfigService.getServiceByName('ORDERMANAGER');
    }

    async init() {
        if (!this.initialized) {
            this.trade_mode = ConfigService.getKeyByFeature(this.name, 'trade');

            if (await this.addListeners()) {
                this.initialized = true;
                return { status: 'success' };
            }
            return { status: 'error', emsg: 'broker not initialized' };
        }
        return { status: 'already initialized' };
    }

    modifyOrder(appid: string, order: any) {
        const open_order = this.ordermanager?.getOpenOrder(this.trade_mode, order.orderid);
        if (open_order !== undefined)
            return this.placeOrder(appid, order, true);

        return { state: 'NOT_OK', emsg: 'order not found' };
    }
}
