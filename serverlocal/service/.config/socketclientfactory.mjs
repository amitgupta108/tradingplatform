import { TPSocket } from '../clients/TPClient.mjs';
import { KMDClient } from '../clients/KMDClient.mjs';

const options = {
    autoReconnect: true,
    maxRetries: 2,
    retryDelay: 2000,
    heartbeatInterval: 10000,
    throttleInterval: 120000,
    logEnabled: true,
};

export class SocketClientFactory 
{
    constructor(name){
        this.name = name;
        this.socket_clients = new Map();
        this.initialized = false
    }

    init()
    {
        if (process.env.PASSTHROUGH === 'Y') 
            this.socket_clients.set('TPCLIENT', new TPSocket('0ce8a0ed-c4a1-4938-940b-b4d3841468g5', 'TPMODE'));

        this.initialized = true;
        return {status: 'success'};
    }

    getSocketClient(key, appid, mode) 
    {
        let c = this.socket_clients.get(key);
        if(c === undefined) {
            c = this.liveSocketClient(key);
            this.socket_clients.set(key, c);
        }
        return c;
    }

    liveSocketClient(key)
    {
        if (key === 'TPCLIENT')
            return new TPSocket('0ce8a0ed-c4a1-4938-940b-b4d3841468g5', 'TPMODE');
        else if (key === 'KMDCLIENT')
            return new KMDClient(options);       
    }
}