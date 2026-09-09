import WebSocket from 'ws';
import qserver from '../stream.mjs';
import { ordermanager } from './ordermanager.mjs';

export class KotakHSISocket 
{
    constructor(parent) {
        this.parent = parent;
        this.reconnect = true;
        this.authdata;
        this.wsping;
        this.ws_hsi;
    }

    hsiconnect(auth_data) {
        this.authdata = auth_data;
        if (this.ws_hsi?.readyState === 1)
            return;

        this.connect();
    }

    connect() {
        this.ws_hsi = new WebSocket(`wss://${this.authdata.baseUrl.substring(8)}/realtime`);
        this.ws_hsi.on('open', () => {
            const payload = `{type:cn,Authorization:${this.authdata.hsi_token},Sid:${this.authdata.hsi_sid},src:WEB}`;
            this.ws_hsi.send(payload);
            console.log('On open hsi ');
        });

        this.ws_hsi.on('message', (data) => {
            const message = JSON.parse(data.toString());
            if (message.type === 'order')
                ordermanager.notifyme(message);
            else if (message.type === 'cn' && message.msg === 'connected')
                this.starthb();
        });

        this.ws_hsi.on('error', (error) => {
            console.log("connection error hsi " + error.code + " " + error.message);
        });

        this.ws_hsi.on('close', (code, reason) => {
            console.log("connection closed hsi " + code + " " + reason.toString());
            this.hsiReconnect();
        });

        this.ws_hsi.on('pong', () => {
            qserver.broadcast('hb', { order_socket: this.ws_hsi?.readyState });
        });

        return { status: 'hsi connect initiated' };
    }

    hsiReconnect() {
        if (this.reconnect) {
            console.log('hsi reconnection attempt');
            this.connect();
        }
    }

    starthb() {
        qserver.broadcast('hb', { order_socket: this.ws_hsi?.readyState });

        if (this.wsping !== undefined)
            clearInterval(this.wsping);

        this.wsping = setInterval(() => {
            this.ws_hsi.ping();
        }, 60000);
    }
}