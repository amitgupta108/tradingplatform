import { OpenAlgoClient } from '../../broker/clients/OpenAlgoClient.mjs';
import { TPSocket } from '../../broker/clients/TPClient.mjs';
import { KMDClient } from '../../broker/clients/KMDClient.mjs';
import { HSMClient } from '../../broker/clients/HSMClient.mjs';
import { KotakHSISocket } from '../../broker/clients/HSIClient.mjs';
import { KotakAdapter } from '../../broker/clients/KotakAdapter.mjs';
import { InfraService } from '../system/service.mjs';
import { ConfigService } from './configservice.mjs';

const options = {
    autoReconnect: true,
    maxRetries: 2,
    retryDelay: 2000,
    heartbeatInterval: 30000,
    throttleInterval: 120000,
    logEnabled: true,
};

export class AdapterFactory extends InfraService
{
    constructor(name){
        super(name);
        this.adapters = new Map();
    }

    cInit()
    {
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
        this.es.addListener('EOD', () => {
            this.adapters.values().forEach((a) => {
                if(typeof a.disconnect === 'function')
                    a.disconnect();
            });
        });
    }
    
    getAdapter(key) 
    {
        let c = this.adapters.get(key);
        if(c === undefined) {
            c = this.creatAdapter(key);
            this.adapters.set(key, c);
        }
        return c;
    }

    creatAdapter(key)
    {
        if( key === 'KOTAKADAPTER')
            return new KotakAdapter('KOTAKADAPTER', options);
        else if (key === 'KMDCLIENT')
            return new KMDClient(options);
        else if (key === 'HSMCLIENT')
            return new HSMClient(options);
        else if (key === 'HSICLIENT')
            return new KotakHSISocket(options);
        else if (key === 'OPENALGOCLIENT')
            return OpenAlgoClient.getInstance();
        else if (key === 'TPCLIENT')
            return new TPSocket(options);
    }
}