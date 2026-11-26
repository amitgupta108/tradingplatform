import { ConfigService } from '../../service/config/configservice.mjs';
import { UserService } from '../../../common/service.js';
import type { Quote, Order } from '../../utils/types.js';

export class TradeSimulator extends UserService {

    private es: any;
    private counter: number;
    private orders: Map<number, Order>;

    constructor(name: string) {
        super(name);
        this.counter = 50000;
        this.orders = new Map();
    }

    async init(): Promise<any> {
        if (!this.initialized) {
            this.es = ConfigService.getServiceByName('EVENTSERVICE');

            const partnerservices = ConfigService.getPartnerFeatureServices(this.name, 'trade', 'view');
            partnerservices.forEach(([key, service]) => {
                if (service !== undefined) {
                    const eventname = service.registerPriceFeed(); //eventname is not loaded initially, hence resorting to key.
                    this.es.addListener(key, (q: Quote) => {
                        this.orderExecutionSim(key, q);
                    });
                }
            });
            this.initialized = true;
            return { status: 'success' }
        }
    }

    placeOrder(appid: string, order: Order) {
        const as = ConfigService.getServiceByName('AUTHSERVICE');
        order.view_mode = as.getFeatureModeforApp(appid, 'view');
        order.orderid = ++this.counter;
        order.state = 'OPENED';
        order.submit_t = Date.now();
        this.orders.set(order.orderid, order);

        this.es.emit('ordersim', order);
        return order;
    }

    orderExecutionSim(view_mode: string, q: Quote) {
        const openorders = Array.from(this.orders.values()).filter((order) => {
            return (order.state === 'OPENED'
                && order.symbol === q.symbol
                && order.view_mode === view_mode);
        });

        if (openorders.length > 0) {
            openorders.forEach((order) => {
                var executed = false;
                if (order.ordertype === 'MARKET')
                    executed = true;
                else if (order.ordertype === 'LIMIT')
                    if (order.action === 'BUY' && q.ltp <= order.price)
                        executed = true;
                    else if (order.action === 'SELL' && q.ltp >= order.price)
                        executed = true;

                if (executed) {
                    order.state = 'COMPLETED';
                    order.pricedAt = q.ltp;
                    order.filled_q = order.quantity;
                    order.exec_t = Date.now();
                    this.es.emit('ordersim', order);
                }
            });
        }
    }

    cancelOrder(appid: string, order: Order): Order | undefined {
        const found = this.orders.get(order.orderid);
        if (found !== undefined && found.state === 'OPENED') {
            found.state = 'CANCELLED';
            this.es.emit('ordersim', found);
        }
        else
            console.error('cancellation failed - order not found or not open');

        return found;
    }

    orderbook(appid: string, stockCode: string): Order[] {
        return Array.from(this.orders.values()).filter((order) => {
            return order.appid === appid
                && order.stockCode === stockCode;
        });
    }

    positions(appid: string, stockCode: string): any[] {
        return [];
    }

    async tearDown(): Promise<any> {

    }
}