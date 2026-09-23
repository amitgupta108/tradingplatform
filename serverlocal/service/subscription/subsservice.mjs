import { subscribe, unsubscribe } from "node:diagnostics_channel";
import { ConfigService } from "../.config/configservice.mjs";
import { eventservice } from "../eventservice.mjs";
import { SubscribersMap } from "./subsciption.mjs";

export class SubsManager 
{
    constructor(name) 
    {
        this.name = name;
        eventservice.addListener('SERVERAPP', (event, appid, data) => {
            this.handleMessage(event, appid, data)
        });
        this.subscriber_map = new SubscribersMap();
        this.initialized = false;
    }
    
    init()
    {
        this.kotakfeed = ConfigService.getSocketClient('KMDCLIENT');
        this.kotakfeed.addListener('quote', (arg) => this.onQuotes(arg));
    }

    onQuotes(q) {
        const subscribers = this.subscriber_map.getSubscribers(q.token);
        subscribers.forEach((appid) => {
            eventservice.emit('quote', appid, q);
        });
    }

    handleMessage(event, appid, data) 
    {
        try 
        {
            if (['subscribe', 'unsubscribe'].includes(event)) {
                const requests = [];
                for(const r of data) {
                    requests.push(r.exchange + '|' + r.token);
                }   

                this.kotakfeed.subscribe(requests, 'Scrips', event, false);
                if(event === 'subscribe')
                    this.subscriber_map.addRequests(appid, data);
                else if(event === 'unsubscribe')
                    this.subscriber_map.removeRequests(appid, data);
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