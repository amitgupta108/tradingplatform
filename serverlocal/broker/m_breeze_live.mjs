import qutils from './quotesutils.mjs';
import adapter from '../adapter/breezeadapter.mjs';
import Order_Service from '../service/ordersimulator.mjs';
import qServer from '../stream.mjs';

let initialized = false;
const mode_live_icici = 'LIVE_2';

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
        adapter.l_subscribe(appid, instruments, action);
    else
        adapter.l_subscribe(appid, instruments, action)
}

function onQuotes(q, mode, appid)
{
    var q = qutils.standardizeiq(q);
    qServer.emitQs(q.stockCode + mode_live_icici, q);

    if(q.key === 'vix' && mode === 'live') {
        qServer.broadcast('vix', q, 'all_nse_live');
        return;
    }
}

function preQ(key, p) {
    if(p.exchange === 'MCX')
        return null;

    p.exchange = key === 'index' || key === 'vix' ? 'NSE' : 'NFO';
    p.stockCode = key === 'vix' ? 'INDVIX' : p.stockCode;
    p.expiry = p.fExpiry;

    return adapter.getHistory(p);
}

function init()
{
    if(!initialized) {
        const status = adapter.addQuoteListener('live-quote', onQuotes);
        adapter.connect(true);        
        initialized = true;
    }
}

export default {
    init,
    subscribe,
    subscribe_vix,
    preQ
  };