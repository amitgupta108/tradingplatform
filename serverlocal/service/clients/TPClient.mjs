import { io } from 'socket.io-client';
import { eventservice } from '../eventservice.mjs';
import { EventEmitter } from 'events';

export class TPSocket extends EventEmitter
{
    constructor(appid, mode) {
        super();
        this.appid = appid;
        this.mode = mode;

        this.reconnect = true;        
        this.ws = io(`${process.env.TP_HOST}:${process.env.TP_PORT}`, {
            auth: {
                token: this.appid,
                mode: this.mode,
            },
            reconnection: true,
            timeout: 5000
        });

        this.registerHandlers();
    }

    registerHandlers() {

        this.ws.on('connect', () => {
            console.log('On tpsocket open ');
        });

        this.ws.on('scrips', (data) => {
            eventservice.emit('scrips', data);
        });

        this.ws.on('quote', (data) => {
            this.emit('quote', data);
        });

        this.ws.on('error', (error) => {
            console.log("connection error tpsocket " + error.code + " " + error.message);
        });

        this.ws.on('disconnect', (code, reason) => {
            console.log("connection closed tpsocket " + code + " " + reason.toString());
        });

        return { status: 'tp connect initiated' };
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