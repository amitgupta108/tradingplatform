import { Connector, KotakConnector, ICICIConnector, TPAppConnector } from './connector.mjs';
import { eventservice } from '../eventservice.mjs';

class AuthService
{
    constructor()
    {
        this.name = 'AUTHSERVICE';
        this.initialized = false;
        this.connectors = {
            kotak: new KotakConnector('kotak', true, true),
            icici: new ICICIConnector('icici', true, true),
            tpapp: new TPAppConnector('tpapp', true, false)
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

    authenticate(id_text) 
    {
        let params = {}; let provider;
        if (id_text.length === 6) {
            params = { arg1: id_text }
            provider = 'kotak';
        } 
        if (id_text === 'icici') {
            provider = 'icici';
        }
        else if (id_text === 'tp-icici-p')
        {
            params = { arg1: 'icici', arg2: 'authcode' };
            provider = 'tpapp';
        }
        else if (id_text === 'tp-kotak-p') {
            params = { arg1: 'kotak', arg2: 'authcode' };
            provider = 'tpapp';
        }
        else 
            return;

        return this.connectors[provider].authenticate(params);
    }

    generateSession(authdata) 
    {
        this.connectors[authdata.provider].generateSession(authdata);
    }

    async value(provider, key)
    {
        const wrapper = {};
        wrapper[key] = undefined;
        return await Connector.authkeys(provider, wrapper);
    }
}

export const authservice = new AuthService();