import { BreezeConnect } from 'breezeconnect';
import {wsmessage} from './qserver.mjs';

const breeze = new BreezeConnect({ "appKey": process.env.breeze_appKey });

let isConnected = false;
let isConnecting = false;

function connect() {
    if (!breeze || !isConnecting || !isConnected)
        return startSession()
            .then((response) => console.log('breeze start triggered'));
}

async function getLiveConnection()
{
    const promises = [];
    const p = new Promise(async (resolve, reject) => {
        if(breeze && isConnected)
            resolve(breeze);
        else if(!isConnected && !isConnecting)
        {
            isConnecting = true;
            let response = await startSession();
            if(response && response.status === 'success')
                resolve(breeze);
        }
    });
    promises.push(p);
    return Promise.any(promises);
}

function startSession()
{
    return breeze.generateSession(process.env.breeze_secret, process.env.breeze_sid)
        .then((resp) => {
            breeze.wsConnect();
            breeze.onTicks = wsmessage;

            isConnected = true;
            isConnecting = false;
            return {status: 'success'};
        });
}

export default {connect, getLiveConnection}