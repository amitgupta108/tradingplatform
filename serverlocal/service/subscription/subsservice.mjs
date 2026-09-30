import { ConfigService } from "../.config/configservice.mjs";
import { eventservice } from "../system/eventservice.mjs";
import { SubscribersMap } from "./subscription.mjs";

export class SubsManager 
{
    constructor(name) 
    {
        this.name = name;
        eventservice.addListener('SERVERAPP', (event, appid, data) => {
            this.handleMessage(event, appid, data)
        });
        this.data_subscribers = new SubscribersMap();
        this.order_subscribers = new SubscribersMap();
        this.initialized = false;
    }
    
    init()
    {
        this.kotak_data = ConfigService.getSocketClient('KMDCLIENT');
        this.kotak_data.addListener('quote', (arg) => this.onQuotes(arg));

        this.kotak_trade = ConfigService.getSocketClient('HSICLIENT');
        this.kotak_trade.addListener('order', (notifier, order) => this.onOrder(notifier, order));

        this.initialized = true;
        return {status: 'success'};
    }

    onQuotes(q) {
        const subscribers = this.data_subscribers.getSubscribers(q.token);
        if (subscribers !== undefined && subscribers.length >= 0)
            subscribers.forEach((appid) => {
                eventservice.emit('quote', appid, q);
            });
    }

    onOrder(notifier, order) {
        const subscribers = this.order_subscribers.getSubscribers(order.symbol);
        if (subscribers !== undefined || subscribers.length !== 0)
            subscribers.forEach((appid) => {
                eventservice.emit('order', appid, order);
            });    
    }

    handleMessage(event, appid, data) 
    {
        try 
        {
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
            else {
                return { status: 'error', message: 'Unknown event type' };
            }
        } catch (error) {
            console.error('Error handling message:', error);
            return { status: 'error', message: error.message };
        }
    }
}