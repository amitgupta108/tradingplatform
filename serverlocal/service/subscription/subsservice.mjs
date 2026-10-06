import { ConfigService } from "../.config/configservice.mjs";
import { SubscribersMap } from "./subscription.mjs";
import { UserService } from "../system/service.mjs";

export class SubsManager extends UserService
{
    constructor(name) 
    {
        super(name);
        this.data_subscribers = new SubscribersMap();
        this.order_subscribers = new SubscribersMap();
        this.initialized = false;
    }
    
    init()
    {
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
        this.es.addListener('SERVERAPP', (message) => {
            if(message.profile.mode === 'history')
                this.historyClient(message);
            else
                this.handleMessage(message)
        });
        this.es.addListener('ordersim', (order) => {
            this.onOrder('ORDERSIMULATOR', order);
        });

        this.sf = ConfigService.getServiceByName('ADAPTERFACTORY');
        this.kotak_data = this.sf.getAdapter('KMDCLIENT');
        this.kotak_data.addListener('quote', (arg) => this.onQuotes(arg));

        this.kotak_trade = this.sf.getAdapter('HSICLIENT');
        this.kotak_trade.addListener('order', (notifier, order) => this.onOrder(notifier, order));

        this.order_simulator = ConfigService.getServiceByName('ORDERSIMULATOR');
        this.history_simulator = ConfigService.getServiceByName('SIMULATOR');

        this.initialized = true;
        return {status: 'success'};
    }

    onQuotes(q) {
        const subscribers = this.data_subscribers.getSubscribers(q.token);
        if (subscribers !== undefined && subscribers.length >= 0)
            subscribers.forEach((appid) => {
                this.es.emit('quote_subsmanager_serverclient', appid, q);
            });
    }

    onOrder(notifier, order) {
        
        this.es.emit('order_subsmanager_serverclient', order.appid, order);
        
    }

    handleMessage(message) 
    {
        try 
        {
            const { event, profile, data } = message;
            const appid = message.appid;
            if (['subscribe', 'unsubscribe'].includes(event)) {
                const requests = [];
                for(const r of data) {
                    requests.push(r.exchange + '|' + r.symbol);
                }   

                this.kotak_data.subscribe(requests, 'Scrips', event, true);
                if(event === 'subscribe')
                    this.data_subscribers.addRequests(appid, data);
                else if(event === 'unsubscribe')
                    this.data_subscribers.removeRequests(appid, data);
            }
            else if (event === 'order') {
                this.order_subscribers.addRequests(appid, data); 
            }
            else if (event === 'place_order') {
                const order = this.order_simulator.placeOrder(appid, data);
                return { status: 'success', order: order };
            }
            else if (event === 'history')
            {
                this.history_simulator.clientConfigure(appid, data.startTime, '1x');
            }
            else {
                return { status: 'error', message: 'Unknown event type' };
            }
        } catch (error) {
            console.error('Error handling message:', error);
            return { status: 'error', message: error.message };
        }
    }

    placeOrder(appid, order) {
        return this.order_simulator.placeOrder(appid, order);
    }

    historyClient(message) {
        const { appid, data } = message;
        this.history_simulator.clientConfigure(appid, data.startTime, '1x');
    }
};