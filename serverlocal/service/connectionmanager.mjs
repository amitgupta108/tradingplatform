import qserver from '../stream.mjs';
import ordermanager from './ordermanager.mjs';
import kotak_socket from '../broker/m_t_kotakneo.mjs';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { get } from 'http';
import { json } from 'stream/consumers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config_path = path.join(__dirname, '..', 'config', '.env.d');

let initialized = false;
let authdata;
var wsping;
var ws_hsi;
var ws_hsm;

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

async function hsmconnect()
{
    if(ws_hsm?.readyState === 1)
        return;

    ws_hsm = new WebSocket(`wss://${process.env.kotak_hsmURL}`);

    ws_hsm.onopen = (event) => {
        const authdata = getSavedCredentials();
        
        if(authdata !== undefined)
        {
            //const payload = `{Authorization:${hsm_token},Sid:${hsm_sid},type:cn}`;
            const payload = JSON.stringify({Authorization: authdata.hsm_token, Sid: authdata.hsm_sid, type: 'cn'});
            ws_hsm.send(payload);
            wshb('hsm', 'start');
            console.log('On open hsm');
        }   
    };

    ws_hsm.onmessage = (event) => {
        try {
            const message = JSON.parse(event);
            console.log('HSM Message received ' + JSON.stringify(message));
            //kotak_neo.onQuotes(message);
        } catch(error) {
            console.log('error hsm: ' + error);
        }          
    };

    ws_hsm.onerror = (event) => {
        console.log("connection error hsm" + JSON.stringify(event));
    }; 
    
    ws_hsm.onclose = (event) => {
        console.log("connection closed hsm" + event.reason);
    };
}

async function hsiconnect()
{
    if(ws_hsi?.readyState === 1)
        return;
    const authdata = getSavedCredentials();
    if(authdata === undefined)
        return;
    
    ws_hsi = new WebSocket(`wss://${authdata.baseUrl.substring(8)}/realtime`);
    ws_hsi.onopen = (event) => {
        
        if(authdata !== undefined)
        {
            const payload = `{type:cn,Authorization:${authdata.hsi_token},Sid:${authdata.hsi_sid},src:WEB}`;
            ws_hsi.send(payload);
            kotak_socket.notifyme(true);
            console.log('On open hsi ');
        }
    };

    ws_hsi.onmessage = (event) => {
        const message = JSON.parse(event.data);

        if(message.type === 'order')
            ordermanager.notifyme(message);
        else if(message.type === 'cn' && message.msg === 'connected'){
            wshb('hsi', 'start');
        }
    };

    ws_hsi.onerror = (event) => {
        console.log("connection error hsi" + JSON.stringify(event));
    }; 
    
    ws_hsi.onclose = (event) => {
        console.log("connection closed hsi" + event.reason);
    };
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


function wshb(type, action)
{
    console.log("websocket heartbeat: " + type + ' - ' + action);
    qserver.broadcast('hb', {order_socket: ws_hsi?.readyState});

    if(action === 'start') {
        if(wsping !== undefined)
            clearInterval(wsping);

        var recon_attempt = 0;
        wsping = setInterval(async (rn) => 
        {            
            qserver.broadcast('hb', { order_socket: ws_hsi?.readyState });
            if(ws_hsi?.readyState !== 1 && rn <= 5) {
                console.log('Attempting reconnection');
                const authdata = getSavedCredentials();
                await hsiconnect();
                rn++;
            }
        }, 120000, recon_attempt);
    }
}

function getSavedCredentials()
{
    if(authdata !== undefined)
        return authdata;

    if(process.env.baseUrl !== undefined)
    {
        const l_authdata = {
            date: process.env.date,
            hsm_sid: process.env.hsm_sid,
            hsm_token: process.env.hsm_token,
            baseUrl: process.env.baseUrl,
            hsi_sid: process.env.hsi_sid,
            hsi_token: process.env.hsi_token
        }
        if(l_authdata.date === new Date().toDateString())
            return l_authdata;
    }
    return undefined;
}

async function saveAuthData(data)
{
    try 
    {
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

function close() {
    clearInterval(wsping);
    ws_hsi?.close();
    qserver.broadcast('hb', { order_socket: ws_hsi?.readyState });
    return { status: 'success' };
}

async function init()
{
    if(!initialized) {
        const authdata = getSavedCredentials();
        if (authdata !== undefined){
            initialized = true;
            hsiconnect();
        }
    }
    return initialized;
}

export default { authenticate, close, hsiconnect, init, getSavedCredentials };