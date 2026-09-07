import qutils from './quotesutils.mjs';
import streamer from '../stream.mjs';
import { Subscriptions } from '../service/subscription/subservice.mjs';

export class BrokerMarketDataImpl
{
    constructor(name, provider)
    {
        this.myviewname = name;
        this.name = this.myviewname;
        this.provider = provider;
        this.view_mode;
        this.simpricefeed = false;
        this.initialized = false;
        this.authData;
        this.my_subs;
        this.symbol_cache = new Map();
    }

    init()
    {
        if (!this.initialized) 
        {
            this.my_subs = new Subscriptions();
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
        this.providerStart(appid, requests);

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
    
        const requests = this.buildRequests(appid, list);
        if (action === 'subs')
        {
            this.my_subs.addRequests(requests);
            this.provider.subscribe(appid, requests);
        }
        else
        {
            this.my_subs.removeRequests(requests);
            this.provider.unsubscribe(appid, requests);
        }
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
    
    onQuotes(q, appid)
    { 
        if (q !== undefined)
        {   
            const qt = this.standardize(q);
            this.emitQuotes(qt, appid);
            if (qt.key === 'futures')
                this.atmReview(qt);
            else if (this.simpricefeed && qt.key === 'strikex')
                qutils.sendQsToSim(view_mode, qt);
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
    }
}