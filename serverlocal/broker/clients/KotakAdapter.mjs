import { BrokerAdapter } from './BrokerAdpater.mjs';

export class KotakAdapter extends BrokerAdapter
{
    constructor(name, options) 
    {
        super(name, options);
        this.endpoints = {};
    }

    initiateConnect(authData){
        this.authData = authData;
        this.cache_url();
    }
    
    cache_url() {
        const baseUrl = this.authData.baseUrl;
        this.endpoints.order = new URL('/quick/order/rule/ms/place', baseUrl).href;
        this.endpoints.modify = new URL('/quick/order/vr/modify', baseUrl).href;
        this.endpoints.cancel = new URL('/quick/order/cancel', baseUrl).href;
        this.endpoints.orderbook = new URL('/quick/user/orders', baseUrl).href;
        this.endpoints.positions = new URL('/quick/user/positions', baseUrl).href;
        this.endpoints.history = new URL('/market-data/1.0/historical/details', baseUrl).href;
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

    get(endpt, params) {
        const headers = this.getHeaders();
        const api_url = this.endpoints[endpt];
        if(params)
            api_url.search = new URLSearchParams(params).toString();

        const options = {
            method: 'GET',
            headers: headers
        }
        return fetch(api_url, options);
    }
}