import qserver from '../../srvr/qserver.mjs';
import { simmanager } from '../service/simmanager.mjs';
import streamer from '../stream.mjs';

qserver.addListener('live-vix', onQuotes);
qserver.addListener('hist-vix', onQuotes);

function history(appid, requests) {

    const promises = [];
    requests.forEach((r) => {
        if (r.exchange === 'MCX')
            return;
        
        r.exchange = ['index', 'vix'].includes(r.key) ? 'NSE' : 'NFO';
        r.stockCode = r.key === 'vix' ? 'INDVIX' : r.stockCode;
        r.expiry = r.fExpiry || r.oExpiry;

        const p = qserver.getHistory(appid, r);
        p.then((response) => {
            if (response?.Error === null)
                streamer.emitHistQs(appid, r.key, response.Success);
            else
                return { status: error, reason: 'history fetch error ' + response.Error };
        });
        //promises.push(p);
    });
    //return Promise.all(promises);
}

function subscribe_vix(appid, mode, action) {
    
    if(mode.startsWith('HISTORY'))
        return simmanager.subscribe_vix(appid, mode, action);
    else
        return qserver.subscribe_vix(appid, mode, action);
}

function onQuotes(q, appid){

    const ltt = (typeof q.datetime === 'string') ? Date.parse(q.datetime) : q.ltt;
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