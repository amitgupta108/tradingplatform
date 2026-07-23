import qutils from './quotesutils.mjs';
import {simmanager} from '../service/simmanager.mjs';
import { EventService } from '../service/eventservice.mjs';
import Order_Service from '../service/ordersimulator.mjs';
import services from '../service/services.mjs';
import streamer from '../stream.mjs';
import path from 'path';
import { subs_store_all, Subscriptions } from '../session/appstate.mjs';

const name = path.parse(import.meta.filename).name;

let initialized = false;
let view_mode;
let my_subs;
const logical_view_name = 'ICICIHISTVIEW';

function onQuotes(q, appid) 
{
    const qt = qutils.standardizeiq(q);
    streamer.emitQs(appid, qt);
    
    if(qt.key === 'strikex')
        qutils.sendQsToSim(view_mode, qt);
    else if (qt.key === 'index') {
        const response = qutils.atmRefresh(logical_view_name, appid, qt);
        if (response.rebuild) {
            response.list.forEach((ost) => {
                subscribe(appid, ost.strikes, 'subs');
            });
        }
    }
}

function clientConfigure(appid, startTime, speed)
{
    simmanager.clientInit(appid, startTime, speed);
}

function exit(appid)
{
    my_subs.removeSubscriptions(appid);
    return simmanager.clear(appid);
}

function startv2(appid, p)
{
    const stock_subs = my_subs.addNewSubscriptions(appid, p);
    const instruments = stock_subs.getSubsItemsByKey(['index', 'futures']);
    const requests = qutils.buildRequests(appid, instruments);

    return simmanager.start_sim(appid, requests, view_mode);
}

function start(appid, instruments, mode) {
    return simmanager.start_sim(appid, instruments, mode);
}

function subscribe(appid, instruments, action)
{
    if(action === 'subs')
        simmanager.subscribe(appid, qutils.buildRequests(appid, instruments), action);
}

function pause(appid, action) 
{
    return simmanager.pause(appid, action);
}

function changeSpeed(appid, speed)
{
    return simmanager.changeSpeed(appid, speed);
}

function init()
{
    if(!initialized) {
        my_subs = new Subscriptions(logical_view_name);
        
        if(view_mode === undefined)
            view_mode = services.getProviderModeKey(logical_view_name, 'view')?.at(0);

        EventService.addListener('hist-quote', onQuotes);
        
        initialized = true;
        return {status:'success'};
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
    startv2
  };