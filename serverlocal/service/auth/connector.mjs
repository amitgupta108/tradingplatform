import { eventservice } from "../eventservice.mjs";
import { Entry } from '@napi-rs/keyring';
import webpage from 'open';

class Connector
{
    constructor(provider){
        this.provider = provider;
        this.initialized = false;
        this.notify = true;
        this.authdata;
    }

    loadAuthdata()
    {
        let l_authdata = Connector.getEmptyAuthdata(this.provider);
        l_authdata = Connector.authkeys(this.provider, l_authdata, 'os');
        if(l_authdata?.date === new Date().toDateString())
        {
            this.authdata = l_authdata;
            this.initialized = true;
            if(this.notify)
                setTimeout(() => {
                    eventservice.emit(`${this.provider}_auth`, this.authdata);
                }, 5000);
        }
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
            eventservice.emit(`${this.provider}_auth`, this.authdata);
        
        Connector.authkeys(this.authdata.provider, this.authdata, 'os');
    }

    static getEmptyAuthdata(provider)
    {
        if(provider === 'icici') {
            return {
                provider: undefined,
                date: undefined,
                appKey: undefined,
                appSecret: undefined,
                authcode: undefined
            }
        }
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