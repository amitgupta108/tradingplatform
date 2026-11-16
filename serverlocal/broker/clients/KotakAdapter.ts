import type { AuthHeaders, AuthData, Endpoints } from "../../utils/types.js";
import { TPAdapter } from './adapter.js';

export class KotakAdapter extends TPAdapter {

    endpoints: Endpoints;

    constructor() {
        super('KOTAKADAPTER', 'kotak');
        this.endpoints = {};
    }

    async onAuthData(authData: AuthData) {
        if (authData.date === new Date().toDateString() && !this.isAuthenticated) {
            this.authData = authData;
            this.cache_url();
            this.isAuthenticated = true;
        }
        this.log(`status: [${this.provider}-${this.isAuthenticated}]`);
        return this.isAuthenticated;
    }

    cache_url() {
        const baseUrl = this.authData!.baseUrl;
        this.endpoints.order = new URL('/quick/order/rule/ms/place', baseUrl).href;
        this.endpoints.modify = new URL('/quick/order/vr/modify', baseUrl).href;
        this.endpoints.cancel = new URL('/quick/order/cancel', baseUrl).href;
        this.endpoints.orderbook = new URL('/quick/user/orders', baseUrl).href;
        this.endpoints.positions = new URL('/quick/user/positions', baseUrl).href;
        this.endpoints.history = new URL(`${baseUrl}/market-data/1.0/historical/details`).href;
        this.endpoints.expiries = new URL(`${baseUrl}/market-data/1.0/watchlist/expiries`);
    }

    getHeaders(endpt: string): AuthHeaders | undefined {
        if (['history', 'expiries'].includes(endpt)) {
            return {
                'Authorization': process.env.kotak_apiKey,
                'Content-Type': 'application/json'
            } as AuthHeaders;
        }
        else {
            if (this.authData!.sid)
                return {
                    'Accept': 'application/json',
                    'neo-fin-key': 'neotradeapi',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Sid': this.authData!.sid,
                    'Auth': this.authData!.token
                } as AuthHeaders;
            else
                this.log('Nosid found for endpoint ' + endpt);
        }
    }

    post(endpt: string, body: any) {
        const headers = this.getHeaders(endpt);
        const requestBody = new URLSearchParams({ jData: JSON.stringify(body) });
        const api_url = this.endpoints[endpt];
        const options = {
            method: 'POST',
            headers: headers,
            body: requestBody.toString()
        };
        return fetch(api_url, options as RequestInit);
    }

    get(endpt: string, params?: any) {
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