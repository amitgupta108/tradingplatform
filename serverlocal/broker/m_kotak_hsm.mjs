import services from '../service/services.mjs';
import scripservice from '../service/scripstore.mjs';
import socketclient from '../service/socketclient.mjs';
import { HSMClient } from '../../dist/marketdatafeed/websocket/HSMClient.js'
import path from 'path';

const name = path.parse(import.meta.filename).name;

const logical_view_name = 'KOTAKHSMVIEW';
let view_mode;
let initialized = false;
let client;
let authData;
const config = {
    autoReconnect: true,
    maxRetries: 5,
    retryDelay: 3000,
    heartbeatInterval: 10000,
    throttleInterval: 30000,
    logEnabled: true,
};

async function init() 
{
    if (!initialized) {
        if (view_mode === undefined)
            view_mode = services.getProviderModeKey(logical_view_name, 'view')?.at(0);

        if (!client)
            client = new HSMClient(config);

        authData = await socketclient.getSavedCredentials();
        if(authData !== undefined)
        {
            client.initiateConnect(authData)
            return { status: 'success' };
        }
        return { status: 'authData not found' };
    }
    return { status: 'already initialized' };
}

function startv2(appid, p)
{
/*    const provider_subs = new Subscriptions(logical_view_name);
    const stock_subs = provider_subs.addNewSubscriptions(p.stockCode + view_mode, p);
    const requests = stock_subs.getSubsItemsByKey(['index', 'futures']);
    const st = requests.find((r) => r.key === 'index');
    if(st !== undefined)
        st.exchange = 'NSE_INDEX';
    
    subscribe(appid, requests, 'subs');
*/
}

function subscribe(appid, list, action) {
    if (list.length === 0)
        return;

    if (action === 'subs')
        client.subscribe(list, onQuotes);
    else
        client.unsubscribe(list, onQuotes);
}

function snapshot(appid, list) {
    if (list.length !== 0) {
        client.requestScripSnapshot(['nse_cm|26000', 'nse_fo|61093']);
    }
}

function onSnapshot(response)
{
    console.log('snapshot response ' + response);
}

export default {init, subscribe, snapshot, onSnapshot, startv2, name}