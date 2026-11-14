import { Socket } from './adapter.js';

export class TPSocket extends Socket {
    constructor() {
        this.name = 'TPCLIENT';
        this.stype = 'socketio';
    }

    initiateConnect(authData) {
        this.authData = authData;
        return this.connect(process.env.TP_SERVER, 'socketio');
    }

    onOpen() {

        this.ws.on('connect', () => {
            this.log('On tpsocket open ');
        });

        this.ws.on('scrips', (data) => {
            this.emit('scrips', data);
        });

        this.ws.on('quote', (data) => {
            this.emit('quote', data);
        });

        this.ws.on('disconnect', (code, reason) => {
            this.log("connection closed tpsocket " + code + " " + reason.toString());
        });

    }

    async getScrips(filters) {
        this.ws.emit('scrips', filters);
    }

    subscribe(list) {
        this.ws.emit('subscribe', list, 'KOTAKLIVEVIEW');

    }
}