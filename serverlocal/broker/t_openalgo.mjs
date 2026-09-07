import OpenAlgo from 'openalgo';
import { ordermanager } from '../service/ordermanager.mjs';
import { BrokerTradeServiceImpl } from './m_broker_interface.mjs';

class OpenAlgoTradeService extends BrokerTradeServiceImpl {
    addListeners() {
        this.provider = new OpenAlgo(process.env.openalgo_key, process.env.openalgo_http, 'v1', process.env.openalgo_ws);

        return this.provider.connect()
            .then(() => {
                return { status: 'success' }
            });
    }

    async orderbook(appid, stockCode) {
        var response = await this.provider.orderbook();
        if (response.status === 'success')
            return response.data.orders.flatMap(o =>
                o.symbol.startsWith(stockCode) ? [formatOutOrder(o)] : []);
    }

    formatOutOrder(order) {
        let { price: pricedAt, triggerPrice: tPrice, quantity: filled_q = 0, order_status: state, ...rest } = order;
        let fOrder = { pricedAt, tPrice, filled_q, state, ...rest };

        fOrder.mode = 'live';
        fOrder.state = fOrder.state === 'open' ? 'opened' : fOrder.state === 'complete' ? 'completed' : fOrder.state;

        return fOrder;
    }

    async neworders(appid, message) {
        const promises = message.orders.map((order) => this.placeOrder(appid, order));
        return await Promise.all(promises);
    }

    async placeOrder(appid, order) {
        const clone = this.formatInOrder(order);
        ordermanager.neworders(appid, [order]);

        let response = await this.provider.placeOrder(clone);
        if (order.state === 'created') {
            order.state = 'submitted';
            order.orderid = response.orderid;
            order.status = response.status;
        };
        console.log('order confirmation ' + JSON.stringify(response) + ' for order ' + JSON.stringify(order));
        return response;
    }

    formatInOrder(order) {
        let { mode, appid, orderN, state, time, stockCode, ...trimmedOrder } = order;
        return trimmedOrder;
    }

    cancelOrder(order) {
        this.provider.cancelOrder({ orderId: order.orderid })
            .then((resp) => {
                console.log('order cancellation response ' + JSON.stringify(resp));
            });
    }
}

export const t_openalgo_trade = new OpenAlgoTradeService('OPENALGOTRADE', undefined);