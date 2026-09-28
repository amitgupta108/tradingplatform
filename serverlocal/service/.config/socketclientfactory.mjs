import { TPSocket } from '../clients/TPClient.mjs';
import { KMDClient } from '../clients/KMDClient.mjs';
import { HSMClient } from '../clients/HSMClient.mjs';
import { KotakHSISocket } from '../clients/HSIClient.mjs';
import { SystemService } from '../service.mjs';

const options = {
    autoReconnect: true,
    maxRetries: 2,
    retryDelay: 2000,
    heartbeatInterval: 30000,
    throttleInterval: 120000,
    logEnabled: true,
};

export class SocketClientFactory extends SystemService
{
    constructor(name){
        super(name);
        this.socket_clients = new Map();
    }

    getSocketClient(key) 
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
            return new TPSocket(options);
        else if (key === 'KMDCLIENT')
            return new KMDClient(options);
        else if (key === 'HSMCLIENT')
            return new HSMClient(options);
        else if (key === 'HSICLIENT')
            return new KotakHSISocket(options);
    }
}