import { ConfigService } from '../../service/config/configservice.mjs';
import { BrokerTradeServiceImpl } from '../common/m_broker_interface.mjs';
import { EXCHANGES } from '../../utils/constants.js';

export class KotakNeoTradeService extends BrokerTradeServiceImpl {
    constructor(name) {
        super(name);
    }

    addListeners() {
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
        this.es.addListener('kotak_auth', (data) => {
            this.onAuthData(data);
            this.ordermanager.register(this.trade_mode, 'HSICLIENT');
        });

        this.af = ConfigService.getServiceByName('ADAPTERFACTORY');
        this.adapter = this.af.getAdapter('KOTAKADAPTER');
    }

    onAuthData(authData) {
        this.authData = authData;
        this.adapter.initiateConnect(this.authData);
        this.initialized = true;
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
        let orders;
        if (response.ok) {
            const order_json = (await response.json());

            if (order_json.stat !== 'Not_Ok') {
                orders = order_json.data;
                return orders.map((order) => {
                    const odr = this.ordermanager.formatLiveOrder(order);
                    odr.trade_mode === this.trade_mode;
                    this.ordermanager.addOrders(odr);
                    return odr;
                })
                    .filter((order) => order.stockCode === stockCode)
                    .sort((a, b) => a.orderid - b.orderid);
            }
            this.log('error fetching orders ' + order_json.status + ' ' + order_json.statusText);
            return [];
        }
        this.log('error fetching orders ' + response.status + ' ' + response.statusText);
        return [];
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
            this.log('error fetching positions ' + position_json.status + ' ' + position_json.statusText);
            return [];
        }
        this.log('error fetching positions ' + response.status + ' ' + response.statusText);
        return [];
    }
}