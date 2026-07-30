import scrip_service from '../service/scripstore.mjs';
import qutils from './quotesutils.mjs';
import streamer from '../stream.mjs';
import services from '../service/services.mjs';
import socketclient from '../service/socketclient.mjs';
import { HSMClient } from '../../dist/marketdatafeed/websocket/HSMClient.js'
import { Subscriptions } from '../session/appstate.mjs';

const myviewname = 'KOTAKHSMVIEW';
const name = myviewname;
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

async function init(feature) 
{
    if (!initialized) 
    {
        my_subs = new Subscriptions(myviewname);
        view_mode = services.getProviderModeKey(myviewname, 'view')?.at(0);

        if (!client) {
            client = new HSMClient(config);
            client.addListener('quote', onQuotes);
        }

        authData = await socketclient.getSavedCredentials();
        if(authData !== undefined)
        {
            client.initiateConnect(authData);
            initialized = true;
            return { status: 'success' };
        }
        return { status: 'authData not found' };
    }
    return { status: 'already initialized' };
}

function startv2(appid, p)
{
    const stock_subs = my_subs.addNewSubscriptions(p.stockCode + view_mode, p);
    stock_subs.addListener('ATMChange', onATMChange);
    const requests = stock_subs.getSubsItems(['index', 'futures']);
    
    subscribe(appid, requests, 'subs');
}

function subscribe(appid, list, action) 
{
    if (!list || list.length === 0)
        return;

    const requests = [];
    list.forEach((e) => {
        const exchange = e.exchange === 'MCX' ? 'mcx_fo' : e.key === 'index' ? 'nse_cm' : 'nse_fo';    
        const key = e.exchange === 'NFO' && e.key === 'strikex' ? e.symbol.slice(0, -2) + '.00' + e.symbol.slice(-2) : e.symbol;
        const column = (e.exchange === 'NFO') ? 'scripReferenceKey' : 'tradingSymbol';
        
        const token = e.key === 'index' ? '26000' : scrip_service.findScripByKey(column, key)?.symbol;
        
        
        if(exchange !== undefined && token !== undefined)
            requests.push(exchange + '|' + token);
    });

    if (action === 'subs')
        client.subscribeScrips(requests);
    else
        client.unsubscribeScrips(requests);
}

function option_chain(appid, stockCode, expiry, action) {
    const stock_subs = my_subs.getSubscriptions(stockCode + view_mode);
    const response = stock_subs.optionChainAction(expiry, action);
    if (response !== undefined) {
        subscribe(appid, response.strikes, response.action);
    }
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

function onATMChange(uq) {
    const l_appid = uq.stockCode + view_mode;

    const t = my_subs.getSubscriptions(l_appid);
    const strikesset = t.reloadStrikes(uq);

    strikesset.forEach((s) => {
        subscribe(l_appid, s, 'subs');
    });
}

function onQuotes(q)
{ 
    if(q.ltp === undefined || q.ltt === undefined)
        return;

    const qt = qutils.standardize(myviewname, q);
    const l_appid = qt.stockCode + view_mode;
    streamer.emitQs(l_appid, qt);
    
    if(qt.key === 'strikex')
        qutils.sendQsToSim(view_mode, qt);

    const key = qt.exchange === 'MCX' ? 'futures' : 'index';
    if (qt.key === key) {
        setTimeout(() => {
            const stock_subs = my_subs.getSubscriptions(l_appid);
            stock_subs.getNotified('index', qt);
        }, 1000);
    }
}
export default {init, subscribe, snapshot, onSnapshot, startv2, option_chain, name}