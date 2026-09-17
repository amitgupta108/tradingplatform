import { scripstore } from '../../service/scripstore.mjs';
import { ordermanager } from '../../service/ordermanager.mjs';
import { KotakHSISocket } from '../../service/clients/HSIClient.mjs';
import { eventservice } from '../../service/eventservice.mjs';
import { BrokerTradeServiceImpl } from '../common/m_broker_interface.mjs';
import { EXCHANGES, LOTSIZE } from '../../utils/constants.mjs';

class KotakNeoTradeService extends BrokerTradeServiceImpl 
{
    constructor(name, provider) {
        super(name, provider);
    }

    addListeners() {
        eventservice.addListener('kotak_auth', (data) => {
            this.api_wrapper = new KotakTradeAPI(this.name, data);
            const kotak_hsi_socket = new KotakHSISocket(this.trade_mode);
            kotak_hsi_socket.hsiconnect(data);
        });
    }

    async placeOrder(appid, order, modify = false) {
        const korder = this.toKotakOrder(order);
        const action = modify ? 'modify' : 'order';
        const response = await this.api_wrapper.post(action, korder);

        if (response.ok) {
            const result = (await response.json());
            if (result.stat === 'Ok') {
                order.orderid = result.nOrdNo;
                order.state = 'submitted';
                order.trade_mode = this.trade_mode;
                ordermanager.neworders(appid, [order]);
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

    toKotakOrder(order) 
    {
        const new_order = {};

        new_order.am = 'NO',
        new_order.dq = '0',
        new_order.mp = '6',
        new_order.pf = 'N',
        new_order.rt = 'DAY',
        new_order.tp = '0',
        new_order.es = EXCHANGES[order.stockCode]
        new_order.pc = order.product;
        new_order.pr = String(order.price);
        new_order.pt = order.pricetype === 'MARKET' ? 'MKT' : 'L';
        new_order.qt = String(order.quantity * LOTSIZE[order.stockCode] );
        new_order.tt = order.action;
        new_order.ts = scripstore.findScripByRefKey(order.symbol).tradingSymbol;
        if(order.orderid !== undefined)
            new_order.no = order.orderid;

        return new_order;
    }

    async cancelOrder(appid, orderid) {
        const response = await this.api_wrapper.post('cancel', { on: orderid });
        if (response.ok)
            return (await response.json());

        return { stat: 'NOT_OK', emsg: response.errMsg };
    }

    async orderbook(appid, stockCode) {
        const response = await this.api_wrapper.get('orderbook');
        let orders;
        if (response.ok) {
            const order_json = (await response.json());

            if (order_json.stat !== 'Not_Ok') {
                orders = order_json.data;
                return orders.map((order) => {
                    const odr = ordermanager.formatLiveOrder(order);
                    odr.trade_mode === this.trade_mode;
                    ordermanager.addOrders(odr);
                    return odr;
                })
                .filter((order) => order.stockCode === stockCode)
                .sort((a, b) => a.orderid - b.orderid);
            }
            console.log('error fetching orders ' + order_json.status + ' ' + order_json.statusText);
            return [];
        }
        console.log('error fetching orders ' + response.status + ' ' + response.statusText);
        return [];
    }

    async positions(appid, stockCode, cf = true) {
        const response = await this.api_wrapper.get('positions');
        let positions;
        if (response.ok) {
            const position_json = (await response.json());

            if (position_json.stat !== 'Not_Ok') {
                positions = position_json.data;
                return ordermanager.formatPositionRecords(positions, stockCode, cf);
            }
            console.log('error fetching positions ' + position_json.status + ' ' + position_json.statusText);
            return [];
        }
        console.log('error fetching positions ' + response.status + ' ' + response.statusText);
        return [];
    }
}

class KotakTradeAPI {
    constructor(provider, authData) {
        this.provider = provider;
        this.authData = authData;
        this.endpoints = {};
        this.cache_url();
    }

    cache_url() {
        const baseUrl = this.authData.baseUrl;
        this.endpoints.order = new URL('/quick/order/rule/ms/place', baseUrl).href;
        this.endpoints.modify = new URL('/quick/order/vr/modify', baseUrl).href;
        this.endpoints.cancel = new URL('/quick/order/cancel', baseUrl).href;
        this.endpoints.orderbook = new URL('/quick/user/orders', baseUrl).href;
        this.endpoints.positions = new URL('/quick/user/positions', baseUrl).href;
    }

    getHeaders() {
        return {
            'accept': 'application/json',
            'Sid': this.authData.hsi_sid,
            'Auth': this.authData.hsi_token,
            'neo-fin-key': 'neotradeapi',
            'Content-Type': 'application/x-www-form-urlencoded'
        };
    }

    post(endpt, body) {
        const requestBody = new URLSearchParams({ jData: JSON.stringify(body) });
        const headers = this.getHeaders();
        const api_url = this.endpoints[endpt];
        const options = {
            method: 'POST',
            headers: headers,
            body: requestBody.toString()
        };
        return fetch(api_url, options);
    }

    get(endpt) {
        const headers = this.getHeaders();
        const api_url = this.endpoints[endpt];
        const options = {
            method: 'GET',
            headers: headers
        }
        return fetch(api_url, options);
    }
}

export const t_kotak_trade = new KotakNeoTradeService('KOTAKNEOTRADE', undefined);