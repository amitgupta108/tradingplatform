import {Connector, KotakConnector, ICICIConnector} from './connector.mjs';
import { eventservice } from '../eventservice.mjs';

class AuthService
{
    constructor()
    {
        this.name = 'AUTHSERVICE';
        this.initialized = false;
        this.connectors = {
            kotak: new KotakConnector('kotak', true),
            icici: new ICICIConnector('icici', true)
        }
    }

    init()
    {
        eventservice.addListener('ext_auth', (msg) => {
            this.generateSession(msg);
        });

        Object.values(this.connectors).forEach((v) => {
            if(v.load_on_start)
                v.loadAuthdata();
        });

        this.initialized = true;
        return { status: 'initialized' };
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
        this.connectors[authdata.provider].saveAuthCode(authdata);
    }
}

export const authservice = new AuthService();