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
    };

    constructor() {
        super();
        this.name = 'TPREMOTE';

    }

    async init() {
        this.authData = {
            provider: 'tpapp', date: new Date().toDateString(),
            sid: process.env.tp_appKey, token: process.env.tp_mode,
        } as AuthData;

        if (!this.connectSocket && this.URL) {
            this.socket = io(this.URL, {
                auth: {
                    token: process.env.tp_appKey,
                    mode: process.env.tp_mode,
                },
                reconnection: true,
                timeout: 5000
            });
            this.registerHandlers();
        }
        this.isAuthenticated = true;
        return this.isAuthenticated;
    }

    async getScrips(filters: any): Promise<any> {
        let resp = await this.post('scrips', { filters: filters });
        if (resp.ok)
            return await resp.json();
        else
            this.error('Failed to get scrips', resp.statusText);

        return;
    }

    async getExpiries(stockCode: string): Promise<any> {
        let resp = await this.post('expiries', { stockCode: stockCode });
        if (resp.ok) {
            resp = await resp.json();
        }
        return resp;
    }

    async getHistory(stockCode: string, start: string, end: string, interval: string = '5min'): Promise<any> {
        let resp = await this.post('history', { stockCode: stockCode, startDate: start, endDate: end, interval: interval });
        if (resp.ok) {
            resp = (await resp.json());
        }
        return resp;
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
            'sid': process.env.tp_appKey,
            'tohen': process.env.tp_mode,
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