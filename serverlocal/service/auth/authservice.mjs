import Connector from './connector.mjs';
import { eventservice } from '../eventservice.mjs';

const conn_data = {
    fyers: { type: 'web', key: 'RVHE8SFZF4-100', redirect_url: 'http://127.0.0.1/redirect/fyers.html', loopback_value: '' },
    icici: { type: 'web', redirect_url: 'http://127.0.0.1/redirect/icici.html', loopback_value: '' },
};

class AuthService
{
    constructor()
    {
        this.name = 'AUTHSERVICE';
        this.initialized = false;
        this.connectors = {
            fyers: new Connector('fyers'),
            icici: new Connector('icici')
        };
    }

    init()
    {
        eventservice.addListener('ext_auth', (msg) => {
            this.saveAuthCode(msg);
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