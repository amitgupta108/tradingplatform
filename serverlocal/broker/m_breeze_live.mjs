import qutils from './quotesutils.mjs';
import adapter from '../adapter/breezeadapter.mjs';
import Order_Service from '../service/ordersimulator.mjs';
import qServer from '../stream.mjs';
import path from 'path';

const name = path.parse(import.meta.filename).name;

let initialized = false;
const mode_live_icici = 'LIVE_2';



function start(appid, instruments, mode)
{
    return adapter.start(appid, instruments, mode);
}

function subscribe(appid, instruments, action, mode)
{
    if(action === 'subs')
        adapter.l_subscribe(appid, instruments, action);
    else
        adapter.l_subscribe(appid, instruments, action)
}

function onQuotes(q, mode, appid)
{
    var q = qutils.standardizeiq(q);
    qServer.emitQs(q.stockCode + mode_live_icici, q);
}

function exit(appid)
{
    return adapter.exit(appid);
}

function init()
{
    if(!initialized) {
        const status = adapter.addQuoteListener('live-quote', onQuotes);
        
        const promise = adapter.connect();
        if(promise !== undefined)
            return promise.then(() => initialized = true);
    }
}

export default {
    name,
    init,
    subscribe,
    exit
  };