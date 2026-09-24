import {Connector, KotakConnector, ICICIConnector} from './connector.mjs';
import { eventservice } from '../eventservice.mjs';

class AuthService
{
    constructor()
    {
        this.name = 'AUTHSERVICE';
        this.initialized = false;
        this.connectors = {
            kotak: new KotakConnector('kotak', true, true),
            icici: new ICICIConnector('icici', true, true)
        }
    }

    async init()
    {
        eventservice.addListener('ext_auth', (msg) => {
            this.generateSession(msg);
        });

        const values = Array.from(Object.values(this.connectors));
        let status = ' ';
        for(const v of values){
            if(v.load_on_start)
                status = await v.loadAuthdata() + status;
        }
        return { status: status};
    }

    authenticate(provider) 
    {
        const tpt = provider;
        if(tpt.length === 6)
            provider = 'kotak';

        return this.connectors[provider].authenticate(tpt);
    }

    generateSession(authdata) 
    {
        this.connectors[authdata.provider].generateSession(authdata);
    }

    value(provider, key)
    {
        const wrapper = {};
        wrapper[key] = undefined;
        Connector.authkeys(provider, wrapper);
    }
}

export const authservice = new AuthService();