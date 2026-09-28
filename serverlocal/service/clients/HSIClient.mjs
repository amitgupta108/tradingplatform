import qserver from '../../stream.mjs';
import { SocketClient } from './socketclient.mjs';

export class KotakHSISocket extends SocketClient
{
    constructor(options) {
        super('HSICLIENT', options);
        this.wsping;
    }

    initiateConnect(authData) {
        this.authData = authData;
        const url = `wss://${authData.baseUrl.substring(8)}/realtime`
        return this.connect(url, 'ws');
    }

    onOpen() {
        this.authenticate();
        this.ws.on('pong', () => {
            qserver.broadcast('hb', { order_socket: this.ws?.readyState });
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
        qserver.broadcast('hb', { order_socket: this.ws?.readyState });

        if (this.wsping !== undefined)
            clearInterval(this.wsping);

        this.wsping = setInterval(() => {
            this.ws.ping();
        }, 60000);
    }
}