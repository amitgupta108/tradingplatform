import { streamer } from '../../stream.mjs';
import { Socket } from './adapter.js';

export class KotakHSISocket extends Socket {
    constructor() {
        super();
        this.name = 'HSICLIENT';
        this.wsping = undefined;
        this.lasthb = undefined;
    }

    initiateConnect(authData) {
        this.authData = authData;
        const url = `wss://${authData.baseUrl.substring(8)}/realtime`
        return this.connect(url, 'ws');
    }

    onOpen() {
        this.authenticate();
        this.ws.on('pong', () => {
            streamer.broadcast('hb', { order_socket: this.ws?.readyState });
        });
    }

    authenticate() {
        const payload = `{type:cn,Authorization:${this.authData.token},Sid:${this.authData.sid},src:WEB}`;
        this.sendMessage(payload);
        this.log('On open hsi ');
    }

    handleMessage(event) {
        const data = event.data;
        const message = JSON.parse(data.toString());
        if (message.type !== 'cn')
            this.emit(message.type, this.name, message.data);
        else if (message.msg === 'connected')
            this.startHeartbeat();
    }
}