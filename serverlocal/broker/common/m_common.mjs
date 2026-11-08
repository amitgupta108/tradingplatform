import { streamer } from '../../stream.mjs';
import { BrokerMarketDataImpl } from './m_broker_interface.mjs';
import { ConfigService } from '../../service/.config/configservice.mjs';
import { EXCHANGES } from '../../utils/constants.mjs';

export class CommonService extends BrokerMarketDataImpl {
    constructor(name) {
        super(name);
        this.qt_vix = { key: 'vix', stockCode: 'INDIAVIX', ltp: 0, ltt: 0 };
        this.vix_subscribed = false;
    }

    addListeners() {
        if (process.env.PASSTHROUGH === 'Y') {
            this.provider = ConfigService.getAdapter('TPCLIENT');
            this.provider.addListener('quote', (arg) => this.onQuotes(arg));
        }
    }

    history(appid, r) {
        const scrip = this.getScrip(r.symbol);
        if (EXCHANGES[r.stockCode] !== 'mcx_fo') {
            r.exchange = ['NIFTY', 'INDVIX'].includes(r.symbol) ? 'NSE' : 'NFO';
            r.stockCode = r.symbol === 'INDVIX' ? 'INDVIX' : scrip.stockCode;
            r.expiry = scrip.expiry;
            r.interval = r.interval ?? '5minute';
            r.strike = scrip.strike;
            r.right = scrip.right;
            const s = ConfigService.getServiceByName('ICICIHISTVIEW');

            return s.getHistory(appid, r)
                .then((response) => {
                    if (response?.Error === null) {
                        streamer.emitHistQs(appid, r.symbol, response.Success);
                        return { status: 'success' };
                    }
                    return { status: 'error', reason: 'history fetch error ' + response.Error };
                });
        }
    }

    subscribe_vix(appid, mode, action) {
        if (mode.startsWith('HISTORY')) {
            const s = ConfigService.getServiceByName('ICICIHISTVIEW');
            return s.subscribe_vix(appid, mode, action);
        }
        else {
            const s = ConfigService.getServiceByName('ICICILIVEVIEW');
            return s.subscribe_vix(appid, mode, action)
                .then((resp) => {
                    this.vix_subscribed = true;
                    this.log(resp);
                })
                .catch((error) => this.log(error));
        }
    }

    onVix(q) {
        if (q.last !== this.qt_vix.ltp) {
            this.qt_vix.ltt = Date.parse(q.ltt);
            this.qt_vix.ltp = q.last;
            streamer.broadcast('quote', this.qt_vix, 'all_nse_live');
        }
    }

    subscribe(appid, list, action) {
        this.my_subs.addRequests(appid, list);
        if (action === 'subs' || action === 'start')
            this.provider.subscribe(list);
        else
            this.provider.unsubscribe(list);
    }

    standardize(q) {
        return q;
    }
}