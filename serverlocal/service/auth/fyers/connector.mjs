import FyersAPI from "fyers-api-v3/apiService/apiService.js";
import { EventService } from "../../eventservice.mjs";
import { Entry } from '@napi-rs/keyring';
import webpage from 'open';

class Connector
{
    constructor(fyersappid, redirectUrl, logfile){
        this.fyers = new FyersAPI({ path: logfile });
        this.fyers.setAppId(fyersappid);
        this.fyers.setRedirectUrl(redirectUrl);
        this.appKey = 'UDYCHMH455';
        this.access_token;
    }

    authenticate(){
        const authcodeurl = this.fyers.generateAuthCode();    
        webpage(authcodeurl)
        .then(() => {
            console.log(`Opened ${authcodeurl} in your default web browser.`);
        })
        .catch((error) => {
            console.error('Error occurred:', error);
        });    
    }

    generateSession(webreturned)
    {
        this.fyers.generate_access_token({ "secret_key": this.appKey, "auth_code": authdata.authcode })
        .then((response) => {
            console.log(response);
            this.authdata = response;
            this.authdata.date = webreturned.date;
            this.authdata.authcode = webreturned.authcode;
            this.saveCredentials(this.authdata);
        }).catch((error) => {
            console.log(error)
        });
    }

    async saveCredentials(data) {
        try {
            authdata = await authkeys('fyers_auth', data);
            console.log('Auth data saved successfully.');
            initialized = true;
        } catch (error) {
            console.error('Error saving auth data:', error);
        }
    }

    async  authkeys(app, v) {
        const keys = ['date', 'authcode', 'access_token', 'refresh_token'];
        const l_authData = {};

        for (const k in keys) {
            var key = keys[k];
            if (v === undefined)
                l_authData[key] = await (new Entry(app, key)).getPassword();
            else
                await (new Entry(app, key)).setPassword(v[key]);
        }
        return v === undefined ? l_authData : v;
    }
}

export const fyers_connector = new Connector('RVHE8SFZF4-100', 'http://127.0.0.1/redirect/index.html', '');