import qserver from '../../srvr/qserver.mjs';
import { simulator } from '../service/simmanager.mjs';
import streamer from '../stream.mjs';

class CommonService 
{
    constructor()
    {
        this.name = 'COMMONSERVICE';
        this.initialized = false;
    }

    init()
    {
        if(!this.initialized) {
            qserver.addListener('vix', (q, appid) => {
                this.onQuotes(q, appid);
            });
            this.initialized = true;
            return {status: 'success'};
        }
        return { status: 'already initialised' };
    }

    history(appid, r) 
    {
        if (r.exchange === 'MCX')
            return;
        
        r.exchange = ['index', 'vix'].includes(r.key) ? 'NSE' : 'NFO';
        r.stockCode = r.key === 'vix' ? 'INDVIX' : r.stockCode;
        r.expiry = r.fExpiry || r.oExpiry;

        return qserver.getHistory(appid, r)
        .then((response) => {
            if (response?.Error === null) {
                streamer.emitHistQs(appid, r.key, response.Success);
                return {status: 'success'};
            }
            return { status: 'error', reason: 'history fetch error ' + response.Error };
        });
    }

    subscribe_vix(appid, mode, action) {
        
        if(mode.startsWith('HISTORY'))
            return simulator.subscribe_vix(appid, mode, action);
        else
            return qserver.subscribe_vix(appid, mode, action);
    }

    onQuotes(q, appid)
    {
        const ltt = (typeof q.datetime === 'string') ? Date.parse(q.datetime) : q.ltt;
        const ltp = q.close ?? q.last;
        const qt = { key: 'vix', stockCode: q.stock_code, ltp: ltp, ltt: ltt };
        
        if(appid === undefined)
            streamer.broadcast('vix', qt, 'all_nse_live');
        else
            streamer.emitQs(appid, qt);
    }
}

export const m_common_service = new CommonService();