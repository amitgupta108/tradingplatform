import { BreezeConnect } from 'breezeconnect';
import {emit} from './qserver.mjs';

const breeze = new BreezeConnect({ "appKey": process.env.breeze_appKey });;
let anyPromises = [];
let isConnected = false;


function connect() {
    if (!isConnected)
        return startSession();
}

function getLiveConnection()
{
    if (isConnected)
        return breeze;
    else
        return startSession();
        
}

function startSession()
{        
    const p = new Promise((resolve,  reject) => {
        breeze.generateSession(process.env.breeze_secret, process.env.breeze_sid)
        .then((resp) => {
            breeze.wsConnect();
            breeze.onTicks = emit;

            isConnected = true;
            resolve(breeze);
            anyPromises = [];
        }).catch((error) => {
            console.error('breeze start session ' + error);
            reject(error);
        });
    });
    anyPromises.push(p);
    return Promise.any(anyPromises);
}

export default {connect, getLiveConnection}