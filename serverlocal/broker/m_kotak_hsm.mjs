import services from '../service/services.mjs';
import socketclient from '../service/socketclient.mjs';
import { HSMClient } from '../../dist/marketdatafeed/websocket/HSMClient.js'
import { subs_store_all, Subscriptions } from '../session/appstate.mjs';

import path from 'path';
import { parse } from 'date-fns';

const name = path.parse(import.meta.filename).name;

const pattern = "dd/MM/yyyy HH:mm:ss";

const logical_view_name = 'KOTAKHSMVIEW';
let view_mode;
let initialized = false;
let client;
let authData;
let my_subs;
const config = {
    autoReconnect: true,
    maxRetries: 3,
    retryDelay: 3000,
    heartbeatInterval: 10000,
    throttleInterval: 45000,
    logEnabled: true,
};

async function init() 
{
    if (!initialized) {
    
        my_subs = new Subscriptions(logical_view_name);
    
        if (view_mode === undefined)
            view_mode = services.getProviderModeKey(logical_view_name, 'view')?.at(0);

        if (!client)
            client = new HSMClient(config);

        client.addListener('quote', onQuotes);

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
    const stock_subs = my_subs.addNewSubscriptions(p.stockCode + view_mode, p);
    const requests = stock_subs.getSubsItemsByKey(['index', 'futures']);
    
    subscribe(appid, requests, 'subs');
}

function subscribe(appid, list, action) {
    if (list.length === 0)
        return;

    if (action === 'subs')
        client.subscribeScrips('mcx_fo|560977');
    else
        client.unsubscribeScrips(list);
}

function snapshot(appid, list) {
    if (list.length !== 0) {
        client.requestIndexSnapshot(['nse_cm|Nifty 50']);
        client.requestScripSnapshot(['nse_fo|61093', 'nse_fo|63951']); 
    }
}

function onSnapshot(response)
{
    console.log('snapshot response ' + response);
}

function onQuotes(q, t) {
    if(q.ltp !== undefined && q.ltt !== undefined) {
        const timestamped = parse(q.ltt, pattern, new Date()).getTime();
        console.log('network : processing ' + (t - timestamped) + ' : ' + (Date.now() - t));
        //console.error('HSM quote ' + JSON.stringify(q));
    }
}

export default {init, subscribe, snapshot, onSnapshot, startv2, name}