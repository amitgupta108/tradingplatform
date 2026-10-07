import { ConfigService } from '../.config/configservice.mjs';
import { getPassword, setPassword } from 'cross-keychain';
import webpage from 'open';

const authdatatemplate = {
    icici: {
        provider: undefined,
        date: undefined,
        appKey: undefined,
        appSecret: undefined,
        authcode: undefined
    },
    kotak: {
        provider: undefined,
        date: undefined,
        hsm_sid: undefined,
        hsm_token: undefined,
        feedUrl: undefined,
        baseUrl: undefined,
        hsi_sid: undefined,
        hsi_token: undefined
    }
};
export class Connector
{
    constructor(provider, notify = true, load_on_start = true){
        this.provider = provider;
        this.initialized = false;
        this.notify = notify;
        this.load_on_start = load_on_start;
        this.authdata;
    }

    async loadAuthdata()
    {
        const l_authdata = await Connector.authkeys(this.provider, undefined);
        if(l_authdata?.date === new Date().toDateString())
        {
            await this.saveAndNotify(l_authdata);
            this.initialized = true;
        }
        return this.initialized;
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

    getAuthdataTemplate(provider)
    {
        return authdatatemplate[provider];
    }

    async saveAndNotify(authdata)
    {
        this.authdata = authdata;
        const es = ConfigService.getServiceByName('EVENTSERVICE');
        if (this.notify)
            es.emit(`${authdata.provider}_auth`, this.authdata);
        await Connector.authkeys(authdata.provider, this.authdata);
    }

    static authkeys(id, cred) 
    {
        try {
            if(process.env.KEYCHAIN === 'Y')
                return this.keyring(id, cred);
            else 
                return this.lmdb(id, cred);
        } catch (exception) {
            console.error('error in authkeys operation: ' + id + ' ' + exception)
        }
    }

    static lmdb(provider, cred) 
    {
        const ps = ConfigService.getServiceByName('PERSISTENCESERVICE');
        if(cred === undefined)
            cred = ps.get(`authkeys_${provider}`);
        else
            ps.set(`authkeys_${provider}`, cred);

        return cred;
    }

    static async keyring(provider, cred) 
    {
        cred = cred ?? authdatatemplate[provider];
        const entries = Array.from(Object.entries(cred));
        for (const [k, v] of entries)
        {
            if (v === undefined)
                cred[k] = await getPassword(provider, k);
            else
                await setPassword(provider, k, v);
        }
        return cred;
    }
}

export class ICICIConnector extends Connector
{
    constructor(provider, notify, load_on_start) {
        super(provider, notify, load_on_start);
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
            appKey: process.env.breeze_appKey,
            appSecret: process.env.breeze_secret,
            authcode: webreturned.authcode
        }
        this.saveAndNotify(this.authdata);
    }
}

export class KotakConnector extends Connector
{
    constructor(provider, notify, load_on_start){
        super(provider, notify, load_on_start);
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
                mobileNumber: process.env.kotak_mobile,
                ucc: process.env.kotak_ucc,
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

    async authenticate(params) {
        try {
            const lr = await this.apiLogin(params.arg1);
            if (lr.ok) {
                const lr_result = (await lr.json()).data;
                const vr = await this.apiValidate(lr_result.sid, lr_result.token);
                if (vr.ok) {
                    const vr_result = (await vr.json()).data;
                    this.authdata = {
                        provider: this.provider,
                        date: new Date().toDateString(),
                        hsm_sid: lr_result.sid,
                        hsm_token: lr_result.token,
                        baseUrl: vr_result.baseUrl,
                        feedUrl: vr_result.feedUrl,
                        hsi_sid: vr_result.sid,
                        hsi_token: vr_result.token
                    }
                    this.saveAndNotify(this.authdata);
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
}

export class TPAppConnector extends ICICIConnector
{
    constructor(provider, notify, load_on_start){
        super(provider, notify, load_on_start);
    }

    async authenticate(params) 
    {
        const api_url = `${process.env.TP_SERVER}` + '/api/value';
        const options = {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ provider: params.arg1})
        };
        const response = await fetch(api_url, options);
        if(response.ok)
            return await response.json();
        else
            console.log('TPCoonector' + JSON.stringify({state: 'NOT_OK', error: `${response.status}-${response.statusText}` }));
    }
}
