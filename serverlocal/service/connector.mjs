import { Entry } from '@napi-rs/keyring';

let initialized = false;
let authdata;

async function apiLogin(num) {
    var headers = {
        method: "POST",
        timeout: 0,
        headers: {
            "Authorization": process.env.kotak_apiKey,
            "neo-fin-key": 'neotradeapi',
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            mobileNumber: "+919871394231",
            ucc: "V1Z9A",
            totp: num
        }),
    };
    const response = await fetch(process.env.kotak_loginURL, headers);
    return await response.json();
}

async function apiValidate(sid, token) {
    var headers = {
        method: "POST",
        timeout: 0,
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
    const response = await fetch(process.env.kotak_valURL, headers);
    return response.json();
}

async function authenticate(tpt) {
    let response = '-';
    if (tpt === undefined || tpt === '')
        return { status: 'error', reason: 'invalid input' };

    var lr = await apiLogin(tpt);
    if (lr.data != undefined && lr.data.status === 'success') {
        var vr = await apiValidate(lr.data.sid, lr.data.token);
        if (vr?.data?.status === 'success') {
            const l_authdata = {
                date: new Date().toDateString(),
                hsm_sid: lr.data.sid,
                hsm_token: lr.data.token,
                baseUrl: vr.data.baseUrl,
                hsi_sid: vr.data.sid,
                hsi_token: vr.data.token
            }
            await saveAuthData(l_authdata);
            return { status: 'success', reason: '' };
        }
        response = 'kotak validate authentication failed';
    }
    response = 'kotak login authentication failed';

    return { status: 'error', reason: response };
}

async function getSavedCredentials() {

    const v = authdata !== undefined ? authdata : await values('kotak_socket', undefined);

    if (v !== undefined && v['date'] === new Date().toDateString())
        return v;
}

async function saveAuthData(data) {
    try {
        authdata = values('kotak_socket', data);
        console.log('Auth data saved successfully.');
        initialized = true;
    } catch (error) {
        console.error('Error saving auth data:', error);
    }
}

async function values(app, v) {
    const keys = ['date', 'hsm_token', 'hsm_sid', 'baseUrl', 'hsi_token', 'hsi_sid'];
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

export { authenticate, getSavedCredentials };