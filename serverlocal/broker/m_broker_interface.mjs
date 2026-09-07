import streamer from '../stream.mjs';
import { Subscriptions } from '../service/subscription/subservice.mjs';
import { eventservice } from '../service/eventservice.mjs';
import { ConfigService } from '../service/.config/configservice.mjs';

class BrokerImpl 
{
    constructor(name, provider) {
        this.name = name;
        this.provider = provider;
        this.initialized = false;
        this.symbol_cache = new Map();
    }

    exit(appid, sublist) {

    }
}

export class BrokerMarketDataImpl extends BrokerImpl
{
    constructor(name, provider)
    {
        super(name, provider);
        this.myviewname = name;
        this.simpricefeed = false;
        this.authData;
        this.my_subs;
    }

    init()
    {
        if (!this.initialized) 
        {
            this.my_subs = new Subscriptions();
            this.view_mode = ConfigService.getKeyByFeature(this.name, 'view');
            this.addListeners();
            this.initialized = true;
            return {status: 'success'};
        }
        return { status: 'already initialized' };
    }
    
    startv2(appid, p) 
    {
        const stock_subs = this.my_subs.addNewSubscriptions(appid, p);
        const requests = stock_subs.getSubsItems(['index', 'futures']);
        this.subscribe(appid, requests, 'start');

        if (stock_subs.atm !== 0) {
            const strikesset = stock_subs.reloadStrikes({ ltp: stock_subs.atm });
            strikesset.forEach((s) => {
                this.subscribe(appid, s, 'subs');
            });
        }
    }

    subscribe(appid, list, action) 
    {
        if (!list || list.length === 0)
            return;
    
        this.my_subs.addRequests(appid, list);
        const requests = this.buildRequests(appid, list);
        this.providerSubscribe(appid, requests, action);
    }

    atmReview(qt) 
    {
        const t = this.my_subs.getFullSubsList();
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
    
    option_chain(appid, expiry, action) 
    {
        const stock_subs = this.my_subs.getSubscriptions(appid);
        const response = stock_subs.optionChainAction(expiry, action);
        if (response !== undefined) {
            this.subscribe(appid, response.strikes, response.action);
        }
    }
    
    onQuotes(q, appid)
    { 
        q.m1 = Date.now();
        const qt = this.standardize(q);
        if(qt !== undefined)
        {
            this.emitQuotes(qt, appid);
        
            if (qt.key === 'futures')
                this.atmReview(qt);
            else if (this.simpricefeed && qt.key === 'strikex')
                eventservice.emit(this.view_mode, qt);
        }
    }
    
    emitQuotes(qt, appid)
    {
        if (this.myviewname === 'ICICIHISTVIEW')
            streamer.emitQs(appid, qt);
        else {
            const appids = this.my_subs.getSubscribers(qt.symbol);
            appids.forEach((a) => {
                streamer.emitQs(a, qt);
            });
        }
    }

    registerPriceFeed() {
        this.simpricefeed = true;
        return this.view_mode;
    }
}

export class BrokerTradeServiceImpl extends BrokerImpl
{
    constructor(name, provider) 
    {
        super(name, provider);
        this.mytradename = name;
        this.authData;
    }

    init() 
    {
        if (!this.initialized) 
        {
            this.trade_mode = ConfigService.getModesForService(this.name, 'trade');
            this.addListeners();
            this.initialized = true;
            
            return { status: 'success' };
        }
        return { status: 'already initialized' };
    }
}
