import qserver from '../../../srvr/qserver.mjs';
import streamer from '../../stream.mjs';
import { BrokerMarketDataImpl } from './m_broker_interface.mjs';
import { ConfigService } from '../../service/.config/configservice.mjs';

class CommonService extends BrokerMarketDataImpl 
{
    constructor(name, provider)
    {
        super(name, provider);
        this.qt_vix = { key: 'vix', stockCode: 'INDIAVIX', ltp: 0, ltt: 0 };
        this.vix_subscribed = false;
    }

    addListeners() 
    {
        qserver.addListener('vix', (q) => {
            this.onVix(q);
        });

        if(process.env.PASSTHROUGH === 'Y') {
            this.provider = ConfigService.getSocketClient('TPCLIENT');
            this.provider.addListener('quote', (arg) => this.onQuotes(arg));
        }
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

        if (mode.startsWith('HISTORY')) {
            return simulator.subscribe_vix(appid, mode, action);
        }
        else if (!this.vix_subscribed) {
            return qserver.subscribe_vix(appid, mode, action)
                .then((resp) => {
                    this.vix_subscribed = true;
                    console.log(resp);
                })
                .catch((error) => console.log(error));
        }
    }

    onVix(q) {
        if (q.last !== this.qt_vix.ltp) {
            this.qt_vix.ltt = Date.parse(q.ltt);
            this.qt_vix.ltp = q.last;

            streamer.broadcast('vix', this.qt_vix, 'all_nse_live');
        }
    }

    subscribe(appid, list, action) 
    {
        this.my_subs.addRequests(appid, list);
        if(action === 'subs' || action === 'start')
            this.provider.subscribe(list);
        else
            this.provider.unsubscribe(list);
    }

    standardize(q)
    {
        return q;
    }
}

export const m_common_service = new CommonService('COMMONSERVICE', undefined);