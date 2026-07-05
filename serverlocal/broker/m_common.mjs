import adapter from '../adapter/breezeadapter.mjs';
import streamer from '../stream.mjs';

adapter.addQuoteListener('live-vix', onQuotes);
adapter.addQuoteListener('hist-vix', onQuotes);

function history(p) {
    return adapter.getHistory(p);
}

function subscribe_vix(appid, mode, action) {
    
    return adapter.subscribe_vix(appid, mode, action);
}

function onQuotes(q, appid){

    const ltt = (typeof q.ltt === 'string') ? Date.parse(q.ltt) : q.ltt;
    const ltp = q.close ?? q.last;
    const qt = { key: 'vix', stockCode: q.stock_code, exchange: q.exchange_code, ltp: ltp, ltt: ltt };
    if(appid === undefined)
        streamer.broadcast('vix', qt, 'all_nse_live');
    else
        streamer.emitQs(appid, qt);
}

export default {
    history,
    subscribe_vix
}