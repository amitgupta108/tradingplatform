import { eventservice } from "../eventservice.mjs";
import { Entry } from '@napi-rs/keyring';
import webpage from 'open';

export class Connector
{
    constructor(provider, notify = true, load_on_start){
        this.provider = provider;
        this.initialized = false;
        this.notify = notify;
        this.load_on_start = load_on_start;
        this.authdata;
    }

    loadAuthdata()
    {
        let l_authdata = this.getEmptyAuthdata(this.provider);
        l_authdata = Connector.authkeys(this.provider, l_authdata, 'os');
        if(l_authdata?.date === new Date().toDateString())
        {
            this.authdata = l_authdata;
            this.initialized = true;
            if(this.notify)
                setTimeout(() => {
                    eventservice.emit(`${this.provider}_auth`, this.authdata);
                }, 2000);
        }
    }

    authenticate()
    {
        let authcodeurl;
        if(this.provider === 'fyers')    
            authcodeurl = this.connector.generateAuthCode();
        else if(this.provider === 'icici')
            authcodeurl = 'https://api.icicidirect.com/apiuser/home';
        
        webpage(authcodeurl)
        .then(() => {
             return {status: `Opened ${authcodeurl} in your default web browser.`};
        })
        .catch((error) => {
            return { status: 'error', reason: error };
        });    
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

    static authkeys(id, cred, mode = 'os') 
    {
        try
        {
            Object.entries(cred).forEach(([k, v]) => {
                const entry = new Entry(id, k);
                if (v === undefined)
                    cred[k] = entry.getPassword();
                else
                    entry.setPassword(v);
            });
        }
        catch (exception) {
            console.error('error in authkeys operation: ' + id + ' ' + exception)
        }
        return cred;
    }
}

export class ICICIConnector extends Connector
{
    constructor(provider, notify) {
        super(provider, notify, true);
        this.authcodeurl = 'https://api.icicidirect.com/apiuser/home';
    }

    authenticate() 
    {
        webpage(this.authcodeurl)
        .then(() => {
            return { status: `Opened ${this.authcodeurl} in your default web browser.` };
        })
        .catch((error) => {
            return { status: 'error', reason: error };
        });
    }

    generateSession(webreturned) {
        this.authdata = {
            provider: webreturned.provider,
            date: webreturned.date,
            appKey: process.env.breeze_apiKey,
            appSecret: process.env.breeze_secret,
            authcode: webreturned.authcode
        }

        if (this.notify)
            eventservice.emit(`${this.provider}_auth`, this.authdata);

        Connector.authkeys(this.authdata.provider, this.authdata, 'os');
    }

    getEmptyAuthdata() 
    {
        return {
            provider: undefined,
            date: undefined,
            appKey: undefined,
            appSecret: undefined,
            authcode: undefined
        };
    }
}

export class KotakConnector extends Connector
{
    constructor(provider, notify){
        super(provider, notify, true);
    }

    apiLogin(num) 
    {
        const options = {
            method: "POST",
            headers: {
                "Authorization": process.env.kotak_apiKey,
                "neo-fin-key": 'neotradeapi',
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                mobileNumber: "+919871394231",
                ucc: "V1Z9A",
                totp: num
            })
        };
        return fetch(process.env.kotak_loginURL, options);
    }

    apiValidate(sid, token) 
    {
        const options = {
            method: "POST",
            headers: {
                'Authorization': process.env.kotak_apiKey,
                'neo-fin-key': 'neotradeapi',
                'Content-Type': "application/json",
                'sid': sid,
                'Auth': token
            },
            body: JSON.stringify({
                mpin: process.env.kotak_mpin
            }),
        };
        return fetch(process.env.kotak_valURL, options);
    }

    async authenticate(tpt) {
        try {
            const lr = await this.apiLogin(tpt);
            if (lr.ok) {
                const lr_result = (await lr.json()).data;
                const vr = await this.apiValidate(lr_result.sid, lr_result.token);
                if (vr.ok) {
                    const vr_result = (await vr.json()).data;
                    this.authdata = {
                        date: new Date().toDateString(),
                        hsm_sid: lr_result.sid,
                        hsm_token: lr_result.token,
                        baseUrl: vr_result.baseUrl,
                        hsi_sid: vr_result.sid,
                        hsi_token: vr_result.token
                    }
                    eventservice.emit(`${this.provider}_auth`, this.authdata);
                    Connector.authkeys(this.provider, this.authdata, 'os');
                    return { status: 'success'};
                }
                return { status: 'error', reason: 'kotak validate failed ' + vr.statusText};
            }
            return { status: 'error', reason: 'login api call not completed ' + lr.statusText};
        }
        catch (exception) {
            console.error('kotak auth error ' + exception);
            return { status: 'error', reason: 'kotak auth error ' + exception };
        }
    }

    getEmptyAuthdata() 
    {
        return {
            provider: undefined,
            date: undefined,
            hsm_sid: undefined,
            hsm_token: undefined,
            baseUrl: undefined,
            hsi_sid: undefined,
            hsi_token: undefined
        }
    }
}