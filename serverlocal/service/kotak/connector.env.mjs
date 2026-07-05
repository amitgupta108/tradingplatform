import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { get } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config_path = path.join(__dirname, '..', 'config', '.env.d');

let initialized = false;
let authdata;

async function authenticate(tpt) {
    if (tpt === undefined || tpt === '')
        return;

    var lr = await apiLogin(tpt);
    if (lr.data != undefined && lr.data.status === 'success') {
        var vr = await apiValidate(lr.data.sid, lr.data.token);
        if (vr.data.status === 'success') {
            const l_authdata = {
                hsm_sid: lr.data.sid,
                hsm_token: lr.data.token,
                baseUrl: vr.data.baseUrl,
                hsi_sid: vr.data.sid,
                hsi_token: vr.data.token
            }
            await saveAuthData(l_authdata);
            hsiconnect();
            return { status: 'success' };
        }
        console.log('kotak authentication failed');
    }
    return { status: 'error' };
}

async function apiLogin(num)
{
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
            mpin:process.env.kotak_mpin
        }),
    };
    const response = await fetch(process.env.kotak_valURL, headers);
    return response.json();
}

function getSavedCredentials() {
    if (authdata !== undefined)
        return authdata;

    if (process.env.baseUrl !== undefined) {
        const l_authdata = {
            date: process.env.date,
            hsm_sid: process.env.hsm_sid,
            hsm_token: process.env.hsm_token,
            baseUrl: process.env.baseUrl,
            hsi_sid: process.env.hsi_sid,
            hsi_token: process.env.hsi_token
        }
        if (l_authdata.date === new Date().toDateString())
            return l_authdata;
    }
    return undefined;
}

async function saveAuthData(data) {
    try {
        authdata = data;
        var cred_string = `date=${(new Date().toDateString())}\nhsm_sid=${data.hsm_sid}\nhsm_token=${data.hsm_token}\n`
        cred_string += `baseUrl=${data.baseUrl}\nhsi_sid=${data.hsi_sid}\nhsi_token=${data.hsi_token}`;
        await fs.promises.writeFile(config_path, cred_string, 'utf8');
        console.log('Auth data saved successfully.');
        initialized = true;
    } catch (error) {
        console.error('Error saving auth data:', error);
    }
}

export default { authenticate, getSavedCredentials };
