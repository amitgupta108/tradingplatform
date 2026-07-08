import qutils from './quotesutils.mjs';
import adapter from '../adapter/breezeadapter.mjs';
import Order_Service from '../service/ordersimulator.mjs';
import services from '../service/services.mjs';
import qServer from '../stream.mjs';
import path from 'path';
import { subs_store_all, Subscriptions } from '../session/appstate.mjs';

const name = path.parse(import.meta.filename).name;

let initialized = false;
let view_mode;
const logical_view_name = 'ICICIHISTVIEW';
let counter = 0;

function onQuotes(q, appid) {
    var qt = qutils.standardizeiq(q);
    qServer.emitQs(appid, qt);
    
    if(qt.key === 'strikex')
        qutils.sendQsToSim(view_mode, qt);
    else if (qt.key === 'futures' && (counter === 0 || counter++ === 6)) {
        counter = 1;
        const response = qutils.atmRefresh(logical_view_name, appid, qt);
        if (response.refreshed === true) {
            const chains = subs_store_all[logical_view_name].getSubscriptions(appid).getSubsItemsByKey(response.list);
            chains.forEach((oc) => {
                subscribe(appid, oc.strikes, 'subs');
            });
        }
    }
}

function clientConfigure(appid, startTime, speed)
{
    return adapter.init(appid, startTime, speed);
}

function exit(appid)
{
    return adapter.exit(appid);
}

function startv2(appid, stockCode)
{
    const provider_subs = new Subscriptions(logical_view_name);
    const stock_subs = provider_subs.addNewSubscriptions(appid, stockCode);
    const instruments = stock_subs.getSubsItemsByKey(['index', 'futures']);

    return adapter.start(appid, instruments, view_mode);
}

function start(appid, instruments, mode) {
    return adapter.start(appid, instruments, mode);
}

function subscribe(appid, instruments, action)
{
    if(action === 'subs')
        adapter.h_subscribe(appid, instruments, action);
}

function pause(appid, action) 
{
    return adapter.pause(appid, action);
}

function changeSpeed(appid, speed)
{
    return adapter.changeSpeed(appid, speed);
}

function init()
{
    if(!initialized) {
        
        if(view_mode === undefined)
            view_mode = services.getProviderModeKey(logical_view_name, 'view')?.at(0);

        adapter.addQuoteListener('hist-quote', onQuotes);
        
        const promise = adapter.connect();
        if(promise !== undefined){
            return promise.then(() => {
                initialized = true;
                return {status:'success'};
            });
        }
    }
}

export default {
    name,
    init,
    exit,
    pause,
    subscribe,
    changeSpeed,
    clientConfigure,
    start,
    startv2
  };