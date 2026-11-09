import type { AuthHeaders, AuthData, Endpoints } from "../../utils/types.js";
import { BrokerAdapter } from './BrokerAdpater.mjs';

export class KotakAdapter extends BrokerAdapter {

    declare authData: AuthData;
    endpoints: Endpoints;

    constructor(name: string, options: any) {
        super(name, options);
        this.endpoints = {};
    }

    initiateConnect(authData: AuthData) {
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
        this.endpoints.history = new URL(`${baseUrl}/market-data/1.0/historical/details`).href;
        this.endpoints.expiries = new URL(`${baseUrl}/market-data/1.0/watchlist/expiries`);
    }

    getHeaders(endpt: string): AuthHeaders {
        if (['history', 'expiries'].includes(endpt))
            return {
                'Authorization': process.env.kotak_apiKey,
                'Content-Type': 'application/json'
            } as AuthHeaders;
        else
            return {
                'Accept': 'application/json',
                'Sid': this.authData.sid,
                'Auth': this.authData.token,
                'neo-fin-key': 'neotradeapi',
                'Content-Type': 'application/x-www-form-urlencoded'
            } as AuthHeaders;
    }

    post(endpt: string, body: any) {
        const requestBody = new URLSearchParams({ jData: JSON.stringify(body) });
        const headers = this.getHeaders(endpt);
        const api_url = this.endpoints[endpt];
        const options = {
            method: 'POST',
            headers: headers,
            body: requestBody.toString()
        };
        return fetch(api_url, options as RequestInit);
    }

    get(endpt: string, params: any) {
        const headers = this.getHeaders(endpt);
        const api_url = this.endpoints[endpt];
        if (params)
            api_url.search = new URLSearchParams(params).toString();

        const options = {
            method: 'GET',
            headers: headers
        }
        return fetch(api_url, options as RequestInit);
    }
}