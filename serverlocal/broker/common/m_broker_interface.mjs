import { streamer } from '../../stream.mjs';
import { Subscriptions } from '../../service/subscription/subscription.mjs';
import { ConfigService } from '../../service/.config/configservice.mjs';
import { BrokerService } from '../../service/system/service.mjs';

class BrokerImpl extends BrokerService
{
    constructor(name) {
        super(name);
        this.symbol_cache = new Map();
    }
}

export class BrokerMarketDataImpl extends BrokerImpl
{
    constructor(name)
    {
        super(name);
        this.view_mode = ConfigService.getKeyByFeature(this.name, 'view');
        this.simpricefeed = false;
        this.authData;
        this.my_subs;
    }

    init()
    {
        if (!this.initialized) 
        {
            this.es = ConfigService.getServiceByName('EVENTSERVICE');
            this.es.addListener(`${this.name}_unsub`, (appid, list) => {
                this.subscribe(appid, list, 'unsub');
            });
            this.es.addListener('oc_unsub', (count) => {
                this.my_subs.autoUnsub(count);
            });
            this.my_subs = new Subscriptions(this.name);
            
            this.addListeners();
            this.initialized = true;
            
            return {status: 'success'};
        }
        return { status: 'already initialized' };
    }
    
    startv2(appid, p) 
    {
        const stock_subs = this.my_subs.addNewSubscriptions(appid, p);
        const list = stock_subs.exchange === 'mcx_fo' ? ['futures'] : ['index', 'futures'];
        const requests = stock_subs.getSubsItems(list); //st_item
        this.subscribe(appid, requests, 'start');

        if (stock_subs.atm !== 0) {
            const strikesset = stock_subs.reloadStrikes({ ltp: stock_subs.atm });
            strikesset.forEach((s) => {
                this.subscribe(appid, s, 'subs');
            });
        }
    }

    atmReview(qt) 
    {
        const t = this.my_subs.getSubscriptionsForStockCode(qt.stockCode);
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
    
    onQuotes(q)
    { 
        const qt = this.standardize(q);
        if(qt !== undefined)
        {
            this.emitQuotes(qt);
        
            if (qt.key === 'futures')
                this.atmReview(qt);
            else if (this.simpricefeed && qt.key === 'strikex')
                this.es.emit(this.view_mode, qt);
        }
    }
    
    emitQuotes(qt)
    {
        qt.view_mode = this.view_mode;
        if (this.name === 'ICICIHISTVIEW'){
            streamer.emitQs(qt);
        }
        else {
            const appids = this.my_subs.getSubscribers(qt.symbol, true);
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

    stream(appid, action)
    {   
        if(action === 'pause')
            this.my_subs.pauseStream(appid);
        else if(action === 'resume') 
            this.my_subs.resumeStream(appid);
    }

    exit(appid) 
    {
        this.my_subs.removeRequests(appid);   
        this.my_subs.removeSubscriptions(appid);
    }
}

export class BrokerTradeServiceImpl extends BrokerImpl
{
    constructor(name) 
    {
        super(name);
        this.trade_mode = ConfigService.getKeyByFeature(this.name, 'trade');
        this.mytradename = name;
        this.authData;
    }

    init() 
    {
        if (!this.initialized) 
        {
            this.ordermanager = ConfigService.getServiceByName('ORDERMANAGER');
            this.addListeners();
            this.initialized = true;
            
            return { status: 'success' };
        }
        return { status: 'already initialized' };
    }

    modifyOrder(appid, order)
    {
        const open_order = ordermanager.getOpenOrder(this.trade_mode, order.orderid);
        if(open_order !== undefined)
            return this.placeOrder(appid, order, true);

        return { state: 'NOT_OK', emsg: 'order not found'};
    }
}
