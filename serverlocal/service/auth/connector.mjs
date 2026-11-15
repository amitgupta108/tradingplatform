import { Generic } from '../../../generic.js'
import { ConfigService } from '../config/configservice.mjs';
import { getPassword, setPassword } from 'cross-keychain';

export class Connector extends Generic {

    static authdatatemplate = ['provider', 'date', 'feedUrl', 'baseUrl', 'sid', 'token'];
    constructor(provider, load_on_start = true) {
        super();
        this.provider = provider;
        this.name = `${provider}-connector`;
        this.initialized = false;
        this.load_on_start = load_on_start;
        this.authdata;
    }

    async loadAuthdata() {
        const l_authdata = await Connector.authkeys(this.provider, undefined);
        if (l_authdata?.date === new Date().toDateString()) {
            this.authdata = l_authdata;
            this.initialized = true;
        }
        return this.initialized;
    }

    async saveAndNotify(authdata) {
        if (authdata?.date === new Date().toDateString()) {
            this.authdata = authdata;
            const es = ConfigService.getServiceByName('EVENTSERVICE');
            es.emit(`${authdata.provider}_auth`, this.authdata);
            return await Connector.authkeys(authdata.provider, this.authdata);
        }
    }

    static async authkeys(id, cred) {
        if (process.env.KEYCHAIN === 'Y')
            return await Connector.keyring(id, cred);
        else
            return await Connector.lmdb(id, cred);
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

    static async remoteFetch(provider) {
        return fetch(`${process.env.TP_REMOTE_URL}/api/value`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ provider: provider })
        });
    }
}

export class ICICIConnector extends Connector {
    constructor(provider, load_on_start) {
        super(provider, load_on_start);
    }

    async authenticate(authcode) {
        let l_authdata;
        if (authcode === 'tp-icici-p') {
            const response = await Connector.remoteFetch(this.provider);
            if (response.ok)
                l_authdata = await response.json();
            else
                return { status: 'error', reason: response.statusText };
        }
        else
            l_authdata = {
                sid: authcode, provider: this.provider,
                date: new Date().toDateString()
            };
        await this.saveAndNotify(l_authdata);
        return { status: 'success' };
    }
}

export class KotakConnector extends Connector {
    constructor(provider, load_on_start) {
        super(provider, load_on_start);
    }

    async authenticate(authcode) {
        try {
            let response;
            if (authcode === 'tp-kotap-p')
                response = await Connector.remoteFetch(this.provider);
            else {
                const lr = await this.apiLogin(authcode);
                if (lr.ok) {
                    const lr_result = (await lr.json()).data;
                    response = await this.apiValidate(lr_result.sid, lr_result.token);
                }
                else
                    return { status: 'error', reason: 'login api call not completed ' + lr.statusText };
            }
            if (response.ok) {
                const { baseUrl, feedUrl, sid, token, ...result } = (await response.json()).data;
                const l_authdata = { baseUrl, feedUrl, sid, token, provider: this.provider, date: new Date().toDateString() };
                await this.saveAndNotify(l_authdata);
                return { status: 'success' };
            }
            else
                return { status: 'error', reason: 'kotak validate failed ' + response.statusText };
        }
        catch (exception) {
            this.error('kotak auth error ' + exception);
            return { status: 'error', reason: 'kotak auth error ' + exception };
        }
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
}