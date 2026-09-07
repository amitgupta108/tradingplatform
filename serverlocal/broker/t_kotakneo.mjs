import { scripstore } from '../service/scripstore.mjs';
import { ordermanager } from '../service/ordermanager.mjs';
import { kotak_hsi_socket } from '../service/HSIClient.mjs';
import { eventservice } from '../service/eventservice.mjs';
import { state_kotakneo as mystate } from '../session/appstate.mjs';
import { BrokerTradeServiceImpl } from './m_broker_interface.mjs';

class KotakNeoTradeService extends BrokerTradeServiceImpl {
    constructor(name, provider) {
        super(name, provider);
    }

    addListeners() {
        eventservice.addListener('kotak_auth', (data) => {
            mystate.authData = data;
            kotak_hsi_socket.hsiconnect(data);
            this.provider = new KotakTradeAPI();
        });
    }

    async placeOrder(appid, order) {
        const korder = this.toKotakOrder(order);
        const response = await this.provider.post('order', korder);
        ordermanager.neworders(appid, [order]);
        if (response.ok) {
            const result = (await response.json());
            if (result.stat === 'Ok') {
                order.state = 'submitted';
                order.orderid = result.nOrdNo;
            }
            else {
                order.state = 'failed';
                order.stCode = result.stCode;
                order.error = result.emsg;
            }
            return order;
        }
        return { state: 'NOT_OK', emsg: response.errMsg };
    }

    toKotakOrder(order) {
        let ts = order.symbol;
        if (order.exchange === 'NFO') {
            ts = scripstore.findScripByRefKey(order.symbol).tradingSymbol;
        }
        const new_order = mystate.oTemplate;

        new_order.es = order.exchange === 'NFO' ? 'nse_fo' : 'mcx_fo';
        new_order.pc = order.product;
        new_order.pr = String(order.price);
        new_order.pt = order.pricetype === 'MARKET' ? 'MKT' : 'L';
        new_order.qt = String(order.quantity);
        new_order.tt = order.action === 'BUY' ? 'B' : 'S';
        new_order.ts = ts;

        return new_order;
    }

    async cancelOrder(appid, order) {
        const response = await this.provider.post('cancel', { on: order.orderid });
        if (response.ok)
            return (await response.json());

        return { stat: 'NOT_OK', emsg: response.errMsg };
    }

    async orderbook(appid, stockCode) {
        const response = await this.provider.get('orderbook');
        let orders;
        if (response.ok) {
            const order_json = (await response.json());

            if (order_json.stat !== 'Not_Ok') {
                orders = order_json.data;
                return orders.map((order) => ordermanager.formatLiveOrder(order, true))
                    .filter((order) => order.stockCode === stockCode)
                    .sort((a, b) => a.orderid - b.orderid);
            }
            console.log('error fetching positions ' + order_json.status + ' ' + order_json.statusText);
            return [];
        }
        console.log('error fetching positions ' + response.status + ' ' + response.statusText);
        return [];
    }

    async positions(appid, stockCode) {
        const response = await this.provider.get('positions');
        let positions;
        if (response.ok) {
            const position_json = (await response.json());

            if (position_json.stat !== 'Not_Ok') {
                positions = position_json.data;
                return ordermanager.formatPositionRecords(positions, stockCode);
            }
            console.log('error fetching positions ' + position_json.status + ' ' + position_json.statusText);
            return [];
        }
        console.log('error fetching positions ' + response.status + ' ' + response.statusText);
        return [];
    }
}

class KotakTradeAPI {
    constructor() {
        this.cache_url();
    }

    cache_url() {
        const baseUrl = mystate.authData.baseUrl;
        mystate.endpoints.order = new URL('/quick/order/rule/ms/place', baseUrl).href;
        mystate.endpoints.cancel = new URL('/quick/order/cancel', baseUrl).href;
        mystate.endpoints.orderbook = new URL('/quick/user/orders', baseUrl).href;
        mystate.endpoints.positions = new URL('/quick/user/positions', baseUrl).href;
    }

    getHeaders() {
        const auth_data = mystate.authData;
        return {
            'accept': 'application/json',
            'Sid': auth_data.hsi_sid,
            'Auth': auth_data.hsi_token,
            'neo-fin-key': 'neotradeapi',
            'Content-Type': 'application/x-www-form-urlencoded'
        };
    }

    post(endpt, body) {
        const requestBody = new URLSearchParams({ jData: JSON.stringify(body) });
        const headers = getHeaders();
        const api_url = mystate.endpoints[endpt];
        const options = {
            method: 'POST',
            headers: headers,
            body: requestBody.toString()
        };
        return fetch(api_url, options);
    }

    get(endpt) {
        const headers = getHeaders();
        const api_url = mystate.endpoints[endpt];
        const options = {
            method: 'GET',
            headers: headers
        }
        return fetch(api_url, options);
    }
}

export const t_kotak_trade = new KotakNeoTradeService('KOTAKNEOTRADE', undefined);