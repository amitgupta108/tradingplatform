import qserver from '../stream.mjs';
import kotak_neo from './m_t_kotakneo.mjs';
import trade_updater from '../service/tradenotifier.mjs';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { get } from 'http';
import { json } from 'stream/consumers';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config_path = path.join(__dirname, '..', 'config', '.env');

const loginURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiLogin';
const valURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiValidate';
const hsmURL = 'mlhsm.kotaksecurities.com';
let initialized = false;
let authdata;
var wsping;
var ws_hsi;
var ws_hsm;

async function connect(tpt)
{
    const cred = getAuthData();
    if(cred === undefined && tpt !== undefined)
    {
        const l_authdata = await kotak_wsconnect(tpt);
        hsiconnect(l_authdata.hsi_token, l_authdata.hsi_sid, l_authdata.baseUrl);
    }
    else
    {
        console.log('no existing credentials found, not enough information to connect');
    }
}

async function hsmconnect(hsm_token, hsm_sid)
{
    ws_hsm = new WebSocket(`wss://${hsmURL}`);

    ws_hsm.onopen = (event) => {
        //const payload = `{Authorization:${hsm_token},Sid:${hsm_sid},type:cn}`;
        const payload = JSON.stringify({Authorization: hsm_token, Sid: hsm_sid, type: 'cn'});
        ws_hsm.send(payload);
        wshb('hsm', 'start');
        console.log('On open hsm');
    };

    ws_hsm.onmessage = (event) => {
        try {
            const message = JSON.parse(event);
            console.log('HSM Message received ' + JSON.stringify(message));
            kotak_neo.onQuotes(message);
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

async function hsiconnect(hsi_token, hsi_sid, baseUrl)
{
    ws_hsi = new WebSocket(`wss://${baseUrl.substring(8)}/realtime`);

    ws_hsi.onopen = (event) => {
        const payload = `{type:cn,Authorization:${hsi_token},Sid:${hsi_sid},src:WEB}`;
        ws_hsi.send(payload);
        console.log('On open hsi ');
    };

    ws_hsi.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);

            if(message.type === 'order')
                trade_updater.notifyme(message);
            else if(message.type === 'cn' && message.msg === 'connected')
                wshb('hsi', 'start');
        } catch(error) {
            console.log('error hsi: ' + error);
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
            "Authorization": '3ed099c0-1a60-4a65-b24f-8c42747ecffa',
            "neo-fin-key": 'neotradeapi',
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            mobileNumber: "+919871394231",
            ucc: "V1Z9A",
            totp: num
        }),
    };
    const response = await fetch(loginURL, headers);
    return await response.json();
}

async function apiValidate(sid, token) {
    var headers = {
        method: "POST",
        timeout: 0,
        headers: {
            'Authorization': '3ed099c0-1a60-4a65-b24f-8c42747ecffa',
            'neo-fin-key': 'neotradeapi',
            'Content-Type': "application/json",
            'sid': sid,
            'Auth': token
        },
        body: JSON.stringify({
            mpin:'221818' 
        }),
    };
    const response = await fetch(valURL, headers);
    return response.json();
}

function disconnect()
{
    clearInterval(wsping);
    ws_hsi?.close();
}

function wshb(type, action)
{
    console.log("websocket heartbeat: " + action);
    qserver.broadcast('hb', {order_socket: ws_hsi?.readyState});

    if(action === 'start') {
        if(wsping !== undefined)
            clearInterval(wsping);

        var recon_attempt = 0;
        wsping = setInterval(async (rn) => 
        {            
            if(ws_hsi?.readyState !== 1 && rn <= 5) {
                console.log('Attempting reconnection');
                const authdata = getAuthData();
                await hsiconnect(authdata.hsi_token, authdata.hsi_sid, authdata.baseUrl);
                rn++;
            }
            qserver.broadcast('hb', {order_socket: ws_hsi.readyState});
        }, 120000, recon_attempt);
    }
    else
    {
        qserver.broadcast('hb', {order_socket: ws_hsi?.readyState});
        clearInterval(wsping);
    }
}

async function kotak_wsconnect(tpt)
{
    if( tpt === undefined || tpt === '')
        return;

    var lr = await apiLogin(tpt);
    if (lr.data != undefined && lr.data.status === 'success') 
    {
        var vr = await apiValidate(lr.data.sid, lr.data.token);
        const l_authdata = {
            hsm_sid: lr.data.sid,
            hsm_token: lr.data.token,
            baseUrl: vr.data.baseUrl,
            hsi_sid: vr.data.sid,
            hsi_token: vr.data.token
        }
        await saveAuthData(l_authdata);
        return l_authdata;
    }
}

function getAuthData()
{
    if(authdata !== undefined)
        return authdata;

    if(process.env.baseUrl !== undefined)
    {
        const l_authdata = {
            hsm_sid: process.env.hsm_sid,
            hsm_token: process.env.hsm_token,
            baseUrl: process.env.baseUrl,
            hsi_sid: process.env.hsi_sid,
            hsi_token: process.env.hsi_token
        }
        return l_authdata;
    }
}

async function saveAuthData(data)
{
    try 
    {
        authdata = data;
        var cred_string = `hsm_sid=${data.hsm_sid}\nhsm_token=${data.hsm_token}\n`
        cred_string += `baseUrl=${data.baseUrl}\nhsi_sid=${data.hsi_sid}\nhsi_token=${data.hsi_token}`;
        await fs.promises.writeFile(config_path, cred_string, 'utf8');
        console.log('Auth data saved successfully.');
        initialized = true;
    } catch (error) {
        console.error('Error saving auth data:', error);
    }
}

function subscribe(type, subs_string){
    const request = {type: type, scrips: subs_string, channelnum: '1'};
    console.log('Subscribing with request: ' + JSON.stringify(request));
    ws_hsm.send(JSON.stringify(request));
}

async function init()
{
    if(!initialized) {
        if (getAuthData() !== undefined){
            await connect();
            initialized = true;
        }
    }
}

export default { connect, disconnect, getAuthData, subscribe, init };