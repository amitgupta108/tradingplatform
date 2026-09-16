import {eventservice} from './eventservice.mjs'
import streamer from '../stream.mjs';
import { ConfigService as config } from './.config/configservice.mjs';

class OrderSimulator
{
    constructor(name)
    {
        this.name = name;
        this.mytradename = this.name;
        this.initialized = false;
        this.counter = 50000;
        this.orders = new Map();
    }

    init() 
    {
        if (!this.initialized) {
            const mymodes = config.getModesForService(this.name, 'trade');
            mymodes.forEach((m) => {
                const s = config.getActiveServiceByMode('view', m);
                if(s !== undefined)
                {
                    const eventname = s.registerPriceFeed();
                    eventservice.addListener(eventname, (q) => {
                        this.orderExecutionSim(eventname, q);
                    });
                }
            });
            this.initialized = true;
            return { status: 'success' }
        }
    }

    placeOrder(appid, order, mode)
    {
        const provider_key = config.getFeatureMode(mode ,'view');
        order.filled_q = 0;
        order.pricedAt = 0;
        order.orderid = ++this.counter;
        order.state = 'opened';
        order.view_mode = provider_key;
        this.orders.set(order.orderid, order);

        streamer.emitOrders(appid, 'order', order);
        return order;
    }

    orderExecutionSim(view_mode, q) 
    {
        const openorders = Array.from(this.orders.values()).filter((order) => {
            return (order.state === 'opened'
                && order.symbol === q.symbol
                && order.view_mode === view_mode);
        });

        if (openorders.length !== 0) {
            openorders.forEach((order) => {
                var executed = false;
                if (order.pricetype === 'MARKET')
                    executed = true;
                else if (order.pricetype === 'LIMIT')
                    if (order.action === 'BUY' && q.ltp <= order.price)
                        executed = true;
                    else if (order.action === 'SELL' && q.ltp >= order.price)
                        executed = true;

                if (executed) {
                    order.state = 'completed';
                    order.pricedAt = q.ltp;
                    order.filled_q = order.quantity;
                    streamer.emitOrders(order.appid, 'order', order);
                }
            });
        }
    }

    cancelOrder(appid, order) 
    {
        const found = this.orders.get(order.orderid);
        if (found !== undefined && found.state === 'opened') {
            found.state = 'cancelled';
            streamer.emitOrders(appid, 'order', found);
        }
        else
            console.error('cancellation failed - order not found or not open');
        
        return found;
    }

    orderbook(appid, stockCode) 
    {
        return Array.from(this.orders.values()).filter((order) => {
            return order.appid === appid
            && order.stockCode === stockCode;
        });
    }

    positions(appid, stockCode){
        return [];
    }
}

export const ordersimulator = new OrderSimulator('ORDERSIMULATOR');