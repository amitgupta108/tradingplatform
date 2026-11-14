import { Generic } from '../../../generic.mjs'
import { ConfigService } from '../config/configservice.mjs';
import { getPassword, setPassword } from 'cross-keychain';
import webpage from 'open';

export class Connector extends Generic {

    static authdatatemplate = ['provider', 'date', 'feedUrl', 'baseUrl', 'sid', 'token'];
    constructor(provider, notify = true, load_on_start = true) {
        super(true);
        this.provider = provider;
        this.initialized = false;
        this.notify = notify;
        this.load_on_start = load_on_start;
        this.authdata;
    }

    async loadAuthdata() {
        const l_authdata = await Connector.authkeys(this.provider, undefined);
        if (l_authdata?.date === new Date().toDateString()) {
            await this.saveAndNotify(l_authdata);
            this.initialized = true;
        }
        return this.initialized;
    }

    async saveAndNotify(authdata) {
        this.authdata = authdata;
        const es = ConfigService.getServiceByName('EVENTSERVICE');
        if (this.notify)
            es.emit(`${authdata.provider}_auth`, this.authdata);
        await Connector.authkeys(authdata.provider, this.authdata);
    }

    static async authkeys(id, cred) {
        if (process.env.KEYCHAIN === 'Y')
            return await this.keyring(id, cred);
        else
            return await this.lmdb(id, cred);
    }

    static async lmdb(provider, cred) {
        const ps = ConfigService.getServiceByName('PERSISTENCESERVICE');
        if (cred === undefined)
            cred = ps.get(`authkeys_${provider}`);
        else
            await ps.set(`authkeys_${provider}`, cred);

        return cred;
    }

    static async keyring(provider, cred) {
        const entries = cred ? Array.from(Object.entries(cred)) : Connector.authdatatemplate.map((k) => [k, undefined]);
        if (cred === undefined)
            cred = {};

        for (const [k, v] of entries) {
            if (v === undefined)
                cred[k] = await getPassword(provider, k);
            else
                await setPassword(provider, k, v);
        }
        return cred;
    }
}

export class ICICIConnector extends Connector {
    constructor(provider, notify, load_on_start) {
        super(provider, notify, load_on_start);
    }

    generateSession(webreturned) {
        this.authdata = {
            provider: webreturned.provider,
            date: webreturned.date,
            sid: webreturned.sid
        }
        this.saveAndNotify(this.authdata);
    }
}

export class KotakConnector extends Connector {
    constructor(provider, notify, load_on_start) {
        super(provider, notify, load_on_start);
    }

    apiLogin(num) {
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

    apiValidate(sid, token) {
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
                        baseUrl: vr_result.baseUrl,
                        feedUrl: vr_result.feedUrl,
                        sid: vr_result.sid,
                        token: vr_result.token
                    }
                    this.saveAndNotify(this.authdata);
                    return { status: 'success' };
                }
                return { status: 'error', reason: 'kotak validate failed ' + vr.statusText };
            }
            return { status: 'error', reason: 'login api call not completed ' + lr.statusText };
        }
        catch (exception) {
            console.error('kotak auth error ' + exception);
            return { status: 'error', reason: 'kotak auth error ' + exception };
        }
    }
}

export class TPAppConnector extends Connector {
    constructor(provider, notify, load_on_start) {
        super(provider, notify, load_on_start);
    }

    async authenticate(params) {
        const api_url = `${process.env.TP_SERVER}` + '/api/value';
        const options = {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ provider: params.arg1 })
        };
        const response = await fetch(api_url, options);
        if (response.ok)
            return await response.json();
        else
            console.log('TPCoonector' + JSON.stringify({ state: 'NOT_OK', error: `${response.status}-${response.statusText}` }));
    }
}