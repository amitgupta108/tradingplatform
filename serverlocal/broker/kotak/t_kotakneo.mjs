import { ConfigService } from '../../service/config/configservice.mjs';
import { BrokerTradeServiceImpl } from '../common/m_broker_interface.mjs';
import { EXCHANGES } from '../../utils/constants.js';
import { KotakAdapter } from '../clients/KotakAdapter.js';

export class KotakNeoTradeService extends BrokerTradeServiceImpl {
    constructor(name) {
        super(name);
    }

    async addListeners() {
        this.adapter = await KotakAdapter.getInstance();
        this.ordermanager.register(this.trade_mode, 'HSICLIENT');
        return true;
    }

    async placeOrder(appid, order, modify = false) {
        const korder = this.toKotakOrder(order);
        const action = modify ? 'modify' : 'order';
        const response = await this.adapter.post(action, korder);

        if (response.ok) {
            const result = (await response.json());
            if (result.stat === 'Ok') {
                order.orderid = result.nOrdNo;
                order.state = 'submitted';
                order.trade_mode = this.trade_mode;
                this.ordermanager.neworders(appid, [order]);
            }
            else {
                order.state = 'failed';
                order.stCode = result.stCode;
                order.error = result.emsg;
            }
            return order;
        }
        return { state: 'NOT_OK', error: `${response.status}-${response.statusText}` };
    }

    toKotakOrder(order) {
        const scripstore = ConfigService.getServiceByName('SCRIPSTORE');

        const new_order = {
            am: 'NO',
            dq: '0',
            mp: '6',
            pf: 'N',
            rt: 'DAY',
            tp: '0',
            es: EXCHANGES[order.stockCode],
            pc: order.product,
            pr: String(order.price),
            pt: order.ordertype === 'MARKET' ? 'MKT' : 'L',
            qt: String(order.quantity),
            tt: order.action,
            ts: scripstore.findScripByRefKey(order.symbol).tradingSymbol,
            si: '1111111',
            sy: 'category',
            sn: '2222222',
            sc: 'default'
        }
        if (order.type === 'modify') {
            new_order.no = order.orderid;
            new_order.vd = 'DAY';
            new_order.tk = scripstore.findScripByRefKey(order.symbol).token;
        }
        return new_order;
    }

    async cancelOrder(appid, orderid) {
        const response = await this.adapter.post('cancel', { on: orderid });
        if (response.ok)
            return (await response.json());

        return { stat: 'NOT_OK', emsg: response.errMsg };
    }

    async orderbook(appid, stockCode) {
        const response = await this.adapter.get('orderbook');
        if (!response.ok) {
            this.log('error calling orderbook api ' + response.status + ' ' + response.statusText);
            return { status: 'error', reason: 'error calling orderbook api ' + response.status + ' ' + response.statusText };
        }

        const order_json = (await response.json());
        if (order_json.stat === 'Not_Ok') {
            this.log('error fetching orders ' + JSON.stringify(order_json));
            return [];
        }

        const orders = order_json.data;
        return orders.map((order) => {
            const odr = this.ordermanager.formatLiveOrder(order);
            odr.trade_mode === this.trade_mode;
            this.ordermanager.addOrders(odr);
            return odr;
        }).filter((odr) => {
            return odr.stockCode === stockCode;
        }).sort((a, b) => a.orderid - b.orderid);
    }

    async positions(appid, stockCode, cf = true) {
        const response = await this.adapter.get('positions');
        let positions;
        if (response.ok) {
            const position_json = (await response.json());

            if (position_json.stat !== 'Not_Ok') {
                positions = position_json.data;
                return this.ordermanager.formatPositionRecords(positions, stockCode, cf);
            }
            this.log('error fetching positions ' + JSON.stringify(position_json));
            return [];
        }
        this.log('error calling positions api' + response.status + ' ' + response.statusText);
        return [];
    }
}