import { streamer } from '../../stream.mjs';
import { KotakAdapter } from './KotakAdapter.mjs';

export class KotakHSISocket extends KotakAdapter
{
    constructor(options) {
        super('HSICLIENT', options);
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
        const payload = `{type:cn,Authorization:${this.authData.hsi_token},Sid:${this.authData.hsi_sid},src:WEB}`;
        this.sendMessage(payload);
        this.log('On open hsi ');
    }
    
    handleMessage(event)
    {
        const data = event.data;
        const message = JSON.parse(data.toString());
        if (message.type !== 'cn')
            this.emit(message.type, this.name, message.data);
        else if (message.msg === 'connected')
            this.starthb();

    }

    starthb() {

        streamer.broadcast('hb', { order_socket: this.ws?.readyState });

        if (this.wsping !== undefined)
            clearInterval(this.wsping);

        this.wsping = setInterval(() => {
            if(this.lasthb !== undefined && Date.now() - this.lasthb > this.heartbeatInterval + 5000) {
                streamer.broadcast('hb', { order_socket: this.ws?.readyState });
                this.log('Heartbeat timeout, closing socket');
                this.ws.close();
                return;
            }
            this.ws.ping();
        }, this.heartbeatInterval);
    }
}