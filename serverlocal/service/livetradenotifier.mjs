import qserver from '../quotes.mjs';
import trade_updater from '../broker/tradeupdater.mjs';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config_path = path.join(__dirname, '..', 'config', '.env');

const loginURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiLogin';
const ValURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiValidate';
var wsping;
var ws;

async function saveAuthData(data)
{
    try 
    {
        authdata = data;
        var cred_string = `baseUrl=${authdata.baseUrl}\nsid=${authdata.sid}\ntoken=${authdata.token}`;
        await fs.promises.writeFile(config_path, cred_string, 'utf8');
        console.log('Auth data saved successfully.');
    } catch (error) {
        console.error('Error saving auth data:', error);
    }
    
}
async function connect(tpt)
{
    var lr = await apiLogin(tpt);
    if (lr.data != undefined && lr.data.status === 'success') 
    {
        var vr = await apiValidate({sid: lr.data.sid, token: lr.data.token});
        await saveAuthData({baseUrl: vr.data.baseUrl, sid: vr.data.sid, token: vr.data.token});
        wsconnect(authdata);
    }
}

function wsconnect(authdata)
{
    ws = new WebSocket(`wss://${authdata.baseUrl.substring(8)}/realtime`);

    ws.onopen = (event) => {
        const payload = `{type:cn,Authorization:${authdata.token},Sid:${authdata.sid},src:WEB}`;
        ws.send(payload);
        console.log('On open ');
    };

    ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);

            if(message.type === 'order')
                trade_updater.notifyme(message);
            else if(message.type === 'cn' && message.msg === 'connected')
                wshb('start');
        } catch(error) {
            console.log(error);
        }          
    };

    ws.onerror = (event) => {
        console.log("connection error " + JSON.stringify(event));
    }; 
    
    ws.onclose = (event) => {
        console.log("connection closed " + event.reason);
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

async function apiValidate(authdata) {
    var headers = {
        method: "POST",
        timeout: 0,
        headers: {
            'Authorization': '3ed099c0-1a60-4a65-b24f-8c42747ecffa',
            'neo-fin-key': 'neotradeapi',
            'Content-Type': "application/json",
            'sid': authdata.sid,
            'Auth': authdata.token
        },
        body: JSON.stringify({
            mpin:'221818' 
        }),
    };
    const response = await fetch(ValURL, headers);
    return response.json();
}

function disconnect()
{
    clearInterval(wsping);
    if(ws !== undefined)
        ws.close();
}

function wshb(action)
{
    console.log("websocket heartbeat: " + action);
    qserver.broadcast('hb', {order_socket: ws.readyState});

    if(action === 'start') {
        if(wsping !== undefined)
            clearInterval(wsping);

        var recon_attempt = 0;
        wsping = setInterval(async (rn) => 
        {
            if(ws.readyState !== 1 && rn <= 5) {
                console.log('Attempting reconnection');
                wsconnect(authdata);
                rn++;
            }
            qserver.broadcast('hb', {order_socket: ws.readyState});
        }, 120000, recon_attempt);
    }
    else
    {
        qserver.broadcast('hb', {order_socket: ws.readyState});
        clearInterval(wsping);
    }
}

function getAuthData()
{
    if(authdata === undefined)
    {
        if(process.env.baseUrl !== undefined)
        {
            authdata = {
                baseUrl: process.env.baseUrl,
                sid: process.env.sid,
                token: process.env.token
            }
        }
        else
        {
            console.log('Auth data not found in environment variables');
            return null;
        }
    }
    return authdata;
}

var authdata = getAuthData();
if(authdata !== null)
    wsconnect(authdata);

export default { connect, disconnect, getAuthData };