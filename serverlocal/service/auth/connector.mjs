import { Generic } from '../../../common/generic.js'
import { ConfigService } from '../config/configservice.mjs';
import { getPassword, setPassword } from 'cross-keychain';

export class Connector extends Generic {

    static authdatatemplate = ['provider', 'date', 'feedUrl', 'baseUrl', 'sid', 'token'];
    constructor(provider, load_on_start = true) {
        super();
        this.provider = provider;
        this.name = `${provider}-connector`;
        this.initialized = false;
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
        this.load_on_start = load_on_start;
        this.authdata;
    }

    async loadAuthdata(notify) {
        const l_authdata = await Connector.authkeys(this.provider, undefined);
        if (l_authdata?.date === new Date().toDateString()) {
            this.authdata = l_authdata;
            this.initialized = true;
            if (notify)
                this.es.emit(`${this.provider}_auth`, this.authdata);
        }
        return this.initialized;
    }

    async saveAndNotify(authdata) {
        if (authdata?.date === new Date().toDateString()) {
            this.authdata = authdata;
            this.es.emit(`${this.provider}_auth`, this.authdata);
            await Connector.authkeys(authdata.provider, this.authdata);

            return { status: 'success' };
        }
        return { status: 'error', reason: 'authdata is not valid ' + authdata.toString() }
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

    async remoteFetch(provider) {
        const commonutils = ConfigService.getServiceByName('COMMONSERVICE');
        const l_authdata = await commonutils.tpValues(provider);
        return await this.saveAndNotify(l_authdata);
    }
}

export class ICICIConnector extends Connector {
    constructor(provider, load_on_start) {
        super(provider, load_on_start);
    }

    async authenticate(authcode) {
        return await this.saveAndNotify({
            sid: authcode, provider: this.provider,
            date: new Date().toDateString()
        });
    }
}

export class KotakConnector extends Connector {
    constructor(provider, load_on_start) {
        super(provider, load_on_start);
    }

    async authenticate(authcode) {
        const lr = await this.apiLogin(authcode);
        if (!lr.ok)
            return { status: 'error', reason: 'login api call not completed ' + lr.statusText };

        const lr_result = (await lr.json()).data;
        const response = await this.apiValidate(lr_result.sid, lr_result.token);
        if (!response.ok)
            return { status: 'error', reason: 'kotak validate failed ' + response.statusText };

        const { baseUrl, feedUrl, sid, token, ...result } = (await response.json()).data;
        const l_authdata = { baseUrl, feedUrl, sid, token, provider: this.provider, date: new Date().toDateString() };
        return await this.saveAndNotify(l_authdata);
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