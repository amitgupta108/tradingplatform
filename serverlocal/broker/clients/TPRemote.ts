import { TPAdapter } from './adapter.js';
import type { AuthData, AuthHeaders } from '../../utils/types.js';
import { Socket, io } from 'socket.io-client';

export class TPRemoteAdapter extends TPAdapter {
    URL = process.env.TP_REMOTE_URL;
    connectSocket = false;
    socket?: Socket;
    endpoints = {
        scrips: new URL(this.URL + '/api/scrips').href,
        history: new URL(this.URL + '/api/history').href,
        expiries: new URL(this.URL + '/api/expiries').href,
        values: new URL(this.URL + '/api/values').href,
    };

    constructor() {
        super('TPREMOTE', 'tpapp');
    }

    async onAuthData(authData: AuthData) {
        this.authData = {
            provider: this.provider, date: new Date().toDateString(),
            sid: process.env.tp_appKey, token: process.env.tp_mode,
        } as AuthData;

        if (this.connectSocket) {
            this.socket = io(this.URL, {
                auth: {
                    appid: this.authData.sid,
                    mode: this.authData.token,
                },
                reconnection: true,
                timeout: 5000
            });
            this.registerHandlers();
        }
        this.isAuthenticated = true;
        this.log(`status: [${this.provider}-${this.isAuthenticated}]`);
        return this.isAuthenticated;
    }

    async getScrips(filters: any): Promise<any> {
        let resp = await this.post('scrips', { filters: filters });
        if (resp.ok)
            return { status: 'success', scrips: await resp.json() };
        else
            return { status: 'error', reason: resp.statusText };
    }

    async getExpiries(stockCode: string): Promise<any> {
        let resp = await this.post('expiries', { stockCode: stockCode });
        if (resp.ok)
            return { status: 'success', expiries: await resp.json() };
        else
            return { status: 'error', reason: resp.statusText };
    }

    async getValues(provider: string): Promise<any> {
        let resp = await this.post('values', { provider: provider });
        if (resp.ok)
            return { status: 'success', values: await resp.json() };
        else
            return { status: 'error', reason: resp.statusText };
    }

    async getHistory(request: any): Promise<any> {
        let resp = await this.post('history', { request: request });
        if (resp.ok)
            return { status: 'success', history: await resp.json() };
        else
            return { status: 'error', reason: resp.statusText };
    }

    post(endpt: string, body: any) {
        const headers = this.getHeaders(endpt);
        const api_url = this.endpoints[endpt];
        const options = {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        };
        return fetch(api_url, options as RequestInit);
    }

    getHeaders(endpt: string): AuthHeaders | undefined {
        return {
            'sid': this.authData?.sid,
            'token': this.authData?.token,
            'Content-Type': 'application/json'
        } as AuthHeaders;
    }

    registerHandlers() {
        this.socket?.on('connect', () => {
            this.log('On tpsocket open ');
        });

        this.socket?.on('quote', (data) => {
            this.emit('quote', data);
        });

        this.socket?.on('disconnect', (code: any, reason: any) => {
            this.log("connection closed tpsocket " + code + " " + reason);
        });
    }
}