import { streamer } from '../../stream.js';
import { TPSocket } from './adapter.js';

export class KotakHSISocket extends TPSocket {
    constructor() {
        super();
        this.name = 'HSICLIENT';
    }

    async init() {
        const authservice = ConfigService.getServiceByName('AUTHSERVICE');
        const authData = await authservice.authdata('kotak')
        if (authData.date === new Date().toDateString()) {
            this.authData = authData;
            const url = `wss://${authData.baseUrl.substring(8)}/realtime`
            return this.connect(url);
        }
    }

    onOpen() {
        this.authenticate();
        this.ws.on('pong', () => {
            streamer.broadcast('hb', { order_socket: this.ws?.readyState });
        });
    }

    onError(error) {
        streamer.broadcast('hb', { order_socket: this.ws?.readyState });
        this.emit('error', this.name, JSON.stringify({ error: error, code: 401 }));
    }

    authenticate() {
        const payload = `{type:cn,Authorization:${this.authData.token},Sid:${this.authData.sid},src:WEB}`;
        this.sendMessage(payload);
        this.log('On open hsi ');
    }

    onError(error) {
        streamer.broadcast('hb', { order_socket: this.ws?.readyState });
        this.error(error);
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