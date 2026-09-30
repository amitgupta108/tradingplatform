import { SocketClient } from './socketclient.mjs';

export class TPSocket extends SocketClient
{
    constructor(options) {
        super('TPCLIENT', options);
        this.appid;
        this.mode;
    }

    initiateConnect(authData) {
        this.authData = authData;
        return this.connect(authData.url, 'socketio');
    }

    onOpen() {

        this.ws.on('connect', () => {
            console.log('On tpsocket open ');
        });

        this.ws.on('scrips', (data) => {
            this.emit('scrips', data);
        });

        this.ws.on('quote', (data) => {
            this.emit('quote', data);
        });

        this.ws.on('disconnect', (code, reason) => {
            console.log("connection closed tpsocket " + code + " " + reason.toString());
        });

    }

    async getScrips(filters)
    {
        this.ws.emit('scrips', filters);
    }

    subscribe(list)
    {
        this.ws.emit('subscribe', list, 'KOTAKLIVEVIEW');

    }
}