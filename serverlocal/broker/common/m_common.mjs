import { streamer } from '../../stream.js';
import { BrokerMarketDataImpl } from './m_broker_interface.mjs';
import { ConfigService } from '../../service/config/configservice.mjs';
import { EXCHANGES } from '../../utils/constants.js';
import { TPRemoteAdapter } from '../clients/TPRemote.js';

export class CommonService extends BrokerMarketDataImpl {
    constructor(name) {
        super(name);
    }

    async addListeners() {
        if (process.env.PASSTHROUGH === 'Y') {
            this.adapter = await TPRemoteAdapter.getInstance();
            this.adapter.addListener('quote', (arg) => this.onQuotes(arg));
        }
    }

    async tpScrips(filters) {
        this.adapter = await TPRemoteAdapter.getInstance();
        if (this.adapter.isAuthenticated)
            return await this.adapter.getScrips(filters);
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

    onVix(q) {
        if (q.last !== this.qt_vix.ltp) {
            this.qt_vix.ltt = Date.parse(q.ltt);
            this.qt_vix.ltp = q.last;
            streamer.broadcast('quote', this.qt_vix, 'all_nse_live');
        }
    }
}