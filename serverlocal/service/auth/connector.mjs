import FyersAPI from "fyers-api-v3/apiService/apiService.js";
import { BreezeConnect } from 'breezeconnect';

import { eventservice } from "../eventservice.mjs";
import { Entry } from '@napi-rs/keyring';
import webpage from 'open';
import { access } from "node:fs";

class Connector
{
    constructor(provider){
        this.provider = provider;
        this.initialized = false;
        this.notify = true;
        this.authdata;
    }

    authenticate(notify)
    {
        this.notify = notify;
        
        let authcodeurl;
        if(this.provider === 'fyers')    
            authcodeurl = this.connector.generateAuthCode();
        else if(this.provider === 'icici')
            authcodeurl = 'https://api.icicidirect.com/apiuser/home';
        
        webpage(authcodeurl)
        .then(() => {
            console.log(`Opened ${authcodeurl} in your default web browser.`);
        })
        .catch((error) => {
            console.error('Error occurred:', error);
        });    
    }

    saveAuthCode(webreturned)
    {
        if (this.provider === 'fyers')
            this.saveFyersAccessToken(webreturned);
        else if (this.provider === 'icici')
            this.saveBreezeSessionId(webreturned);

        this.initialized = true;
    }

    async saveFyersAccessToken(webreturned)
    {
        this.connector.generate_access_token({ "secret_key": this.conn_data.key, "auth_code": webreturned.authcode })
        .then((response) => {
            console.log(response);
            this.authdata = response;
            this.authdata.date = webreturned.date;
            this.authdata.authcode = webreturned.authcode;
            eventservice('fyers_connect', this.authdata);
        }).catch((error) => {
            console.log(error)
        });;
    }

    saveBreezeSessionId(webreturned)
    {
        this.authdata = {
            provider: webreturned.provider,
            date: webreturned.date,
            appKey: process.env.breeze_apiKey,
            appSecret: process.env.breeze_secret,
            authcode: webreturned.authcode
        }

        if(this.notify)
            eventservice.emit('icici_auth', this.authdata);
        
        Connector.authkeys(this.authdata.provider, this.authdata, 'os');
    }

    static authkeys(id, cred, mode = 'os') 
    {
        Object.entries(cred).forEach(async ([k, v]) => {
            if (v === undefined)
                cred[k] = await(new Entry(id, k)).getPassword();
            else
                await(new Entry(id, k)).setPassword(v);
        })
        return cred;
    }
}

export default Connector;