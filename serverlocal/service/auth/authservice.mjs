import Connector from './connector.mjs';
import { eventservice } from '../eventservice.mjs';

class AuthService
{
    constructor()
    {
        this.name = 'AUTHSERVICE';
        this.initialized = false;
        this.connectors = {
            //fyers: new Connector('fyers'),
            icici: new Connector('icici')
        };
    }

    init()
    {
        eventservice.addListener('ext_auth', (msg) => {
            this.saveAuthCode(msg);
        });
        Object.values(this.connectors).forEach((v) => {
            v.loadAuthdata();
        });

        this.initialized = true;
    }

    authenticate(provider, notify = true) 
    {
        this.connectors[provider].authenticate(notify);
    }

    saveAuthCode(authdata) {
        this.connectors[authdata.provider].saveAuthCode(authdata);
    }
}

export const authservice = new AuthService();