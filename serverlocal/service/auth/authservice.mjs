import {fyers_connector} from './fyers/connector.mjs';
import { EventService } from '../eventservice.mjs';

let initialized = false;
const name = 'ADMINSTREAM';

class AuthService
{
    constructor()
    {
        EventService.addListener('ext_auth', (msg) => {
            this.generateSession(msg);
        });

        this.connectors = {
            fyers: fyers_connector
        };
    }

    authenticate() {
        this.connectors.fyers.authenticate();
    }

    generateSession(authdata) {
        this.connectors.fyers.generateSession(authdata);
    }
}

let authservice;

function init()
{
    authservice = new AuthService();
    initialized = true;
    return { status: 'success' };
}

function authenticate(mode)
{
    if(initialized){
        authservice.authenticate();
    }
}

function generateSession(auth_code)
{
    if(initialized)
        authservice.generateSession(auth_code);
}

export default {
    init,
    authenticate,
    generateSession,
    name
}