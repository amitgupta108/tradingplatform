import { ConfigService} from '../../service/.config/configservice.mjs';
import { LOTSIZE } from '../../utils/constants.mjs';
import { UserService } from '../../service/system/service.mjs';

export class OrderSimulator extends UserService
{
    constructor(name)
    {
        super(name);
        this.mytradename = this.name;
        this.counter = 50000;
        this.orders = new Map();
    }

    init() 
    {
        if (!this.initialized) {
            this.es = ConfigService.getServiceByName('EVENTSERVICE');

            const mymodes = ConfigService.getModesForService(this.name, 'trade');
            mymodes.forEach((m) => {
                const s = ConfigService.getActiveServiceByMode('view', m);
                if(s !== undefined)
                {
                    const eventname = s.registerPriceFeed();
                    this.es.addListener(eventname, (q) => {
                        this.orderExecutionSim(eventname, q);
                    });
                }
            });
            this.initialized = true;
            return { status: 'success' }
        }
    }

    placeOrder(appid, order)
    {
        const as = ConfigService.getServiceByName('AUTHSERVICE');
        order.view_mode = as.getFeatureModeforApp(appid ,'view');
        order.quantity = order.quantity * LOTSIZE[order.stockCode];
        order.filled_q = 0;
        order.pricedAt = 0;
        order.orderid = ++this.counter;
        order.state = 'opened';
        this.orders.set(order.orderid, order);

        this.es.emit('ordersim', order);
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
                    if (order.action === 'B' && q.ltp <= order.price)
                        executed = true;
                    else if (order.action === 'S' && q.ltp >= order.price)
                        executed = true;

                if (executed) {
                    order.state = 'completed';
                    order.pricedAt = q.ltp;
                    order.filled_q = order.quantity;
                    this.es.emit('ordersim', order);
                }
            });
        }
    }

    cancelOrder(appid, order) 
    {
        const found = this.orders.get(order.orderid);
        if (found !== undefined && found.state === 'opened') {
            found.state = 'cancelled';
            this.es.emit('ordersim', found);
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