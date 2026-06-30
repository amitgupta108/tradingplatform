import qutils from './quotesutils.mjs';
import adapter from '../adapter/breezeadapter.mjs';
import Order_Service from '../service/ordersimulator.mjs';
import qServer from '../stream.mjs';
import path from 'path';

const name = path.parse(import.meta.filename).name;

let initialized = false;
const mode_history_icici = 'HISTORY';

function clientConfigure(appid, startTime, speed)
{
    return adapter.init(appid, startTime, speed);
}

function exit(appid)
{
    return adapter.exit(appid);
}

function subscribe_vix(appid, mode, action)
{
    return adapter.subscribe_vix(appid, mode, action);
}

function start(appid, instruments, mode)
{
    return adapter.start(appid, instruments, mode);
}

function subscribe(appid, instruments, action, mode)
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

function onQuotes(q, appid)
{
    var q = qutils.standardizeiq(q);
    qServer.emitQs(appid, q);
}

function history(p) {
    return adapter.getHistory(p);
}

function init()
{
    if(!initialized) {
        adapter.addQuoteListener('hist-quote', onQuotes);
        const promise = adapter.connect();
        if(promise !== undefined)
            return promise.then(() => initialized = true);
    }
}

export default {
    name,
    init,
    exit,
    pause,
    subscribe,
    changeSpeed,
    subscribe_vix,
    clientConfigure,
    start,
    history
  };