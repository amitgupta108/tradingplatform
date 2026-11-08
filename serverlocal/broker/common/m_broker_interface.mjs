import { streamer } from '../../stream.mjs';
import { Subscriptions } from '../../service/subscription/subscription.mjs';
import { ConfigService } from '../../service/.config/configservice.mjs';
import { BrokerService } from '../../service/system/service.mjs';

class BrokerImpl extends BrokerService {
    constructor(name) {
        super(name);
        this.symbol_cache = new Map();
    }

    getScrip(symbol) {
        const t = { symbol: symbol } //template
        const regex = /[0-9]/;
        const idx = symbol.search(regex);
        t.stockCode = idx === -1 ? symbol : symbol.slice(0, idx);
        t.key = symbol.endsWith('FUT') ? 'futures' : symbol.endsWith('PE') || symbol.endsWith('CE') ? 'strikex' : 'index';
        if (idx !== -1) {
            t.expiry = symbol.slice(idx, idx + 7);
            if (!symbol.endsWith('FUT')) {
                t.strike = symbol.slice(idx + 7, -2);
                t.right = symbol.slice(-2);
            }
        }
        return t;
    }
}

export class BrokerMarketDataImpl extends BrokerImpl {
    constructor(name) {
        super(name);
        this.view_mode = ConfigService.getKeyByFeature(this.name, 'view');
        this.simpricefeed = false;
        this.authData;
        this.subscriptions;
    }

    init() {
        if (!this.initialized) {
            this.es = ConfigService.getServiceByName('EVENTSERVICE');
            this.es.addListener(`${this.name}_unsub`, (appid, list) => {
                this.subscribe(appid, list, 'unsub');
            });
            this.es.addListener('oc_unsub', (count) => {
                this.subscriptions.autoUnsub(count);
            });
            this.subscriptions = new Subscriptions(this.name);

            this.addListeners();
            this.initialized = true;

            return { status: 'success' };
        }
        return { status: 'already initialized' };
    }

    startv2(appid, p) {
        const stock_subs = this.subscriptions.addNewSubscriptions(appid, p);
        const requests = stock_subs.getSubsItems(['futures']); //st_item
        this.subscribe(appid, requests, 'start');
        this.subscribeIndices(appid, p.stockCode);

        if (stock_subs.atm !== 0) {
            const strikesset = stock_subs.reloadStrikes({ ltp: stock_subs.atm });
            strikesset.forEach((s) => {
                this.subscribe(appid, s, 'subs');
            });
        }
    }

    atmReview(qt) {
        const t = this.subscriptions.getSubscriptionsForStockCode(qt.stockCode);
        t.forEach((ss) => {
            const response = ss.getNotified(qt);
            if (response !== undefined && response.load === true) {
                const strikesset = ss.reloadStrikes(response.uq);
                strikesset.forEach((set) => {
                    this.subscribe(ss.appid, set, 'subs');
                });
            }
        });
    }

    /** deprecated **/
    option_chain(appid, expiry, action) {
        const stock_subs = this.subscriptions.getSubscriptions(appid);

        const response = stock_subs.option_chain(expiry, action.value);
        if (response !== undefined && response.status === 'success')
            this.subscribe(appid, response.strikes, response.action);
    }


    optionchainAction(appid, expiry, action) {
        const subs = this.subscriptions.getSubscriptions(appid);
        if (subs !== undefined) {
            const response = subs.optionChain(expiry, action);
            if (action.key === 'subscribe' && response.status === 'success') {
                this.subscribe(appid, response.strikes, action.value);
            }
            else if (action.key === 'stream' && response.status === 'success') {
                this.log(`optionchainAction: ${action.key} - ${action.value} - success`);
            }
        }
    }

    onQuotes(q, appid) {
        const qt = this.standardize(q);
        if (qt !== undefined) {
            this.emitQuotes(qt, appid);

            if (qt.key === 'futures')
                this.atmReview(qt);
            else if (this.simpricefeed && qt.key === 'strikex')
                this.es.emit(this.view_mode, qt);
        }
    }

    emitQuotes(qt, appid) {
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

    stream(appid, action) {
        if (action === 'pause')
            this.subscriptions.pauseStream(appid);
        else if (action === 'resume')
            this.subscriptions.resumeStream(appid);
    }

    exit(appid) {
        this.subscriptions.removeRequests(appid);
        this.subscriptions.removeSubscriptions(appid);
    }
}

export class BrokerTradeServiceImpl extends BrokerImpl {
    constructor(name) {
        super(name);
        this.trade_mode = ConfigService.getKeyByFeature(this.name, 'trade');
        this.mytradename = name;
        this.authData;
    }

    init() {
        if (!this.initialized) {
            this.ordermanager = ConfigService.getServiceByName('ORDERMANAGER');
            this.addListeners();
            this.initialized = true;

            return { status: 'success' };
        }
        return { status: 'already initialized' };
    }

    modifyOrder(appid, order) {
        const open_order = ordermanager.getOpenOrder(this.trade_mode, order.orderid);
        if (open_order !== undefined)
            return this.placeOrder(appid, order, true);

        return { state: 'NOT_OK', emsg: 'order not found' };
    }
}
