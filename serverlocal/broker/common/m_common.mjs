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

    async tpExpiries(stockCode) {
        this.adapter = await TPRemoteAdapter.getInstance();
        if (this.adapter.isAuthenticated)
            return await this.adapter.getExpiries(stockCode);
    }

    async tpScrips(filters) {
        this.adapter = await TPRemoteAdapter.getInstance();
        if (this.adapter.isAuthenticated)
            return await this.adapter.getScrips(filters);
    }

    async tpValues(provider) {
        this.adapter = await TPRemoteAdapter.getInstance();
        if (this.adapter.isAuthenticated)
            return await this.adapter.getValues(provider);
    }

    async tpHistory(request) {
        this.adapter = await TPRemoteAdapter.getInstance();
        if (this.adapter.isAuthenticated)
            return await this.adapter.getHistory(request);
    }

    async history(request, appid) {
        const scrip = this.getScrip(request.symbol);
        if (EXCHANGES[request.stockCode] === 'mcx_fo')
            return;

        let response;
        if (process.env.PTFETCH_HISTORY === 'Y')
            response = await this.tpHistory(request);
        else {
            const s = ConfigService.getServiceByName('ICICIHISTVIEW');
            response = await s.getHistory(appid, request);
        }

        if (response.Error)
            return { status: 'error', reason: 'history fetch error ' + response.Error };
        else if (appid === undefined)
            return response.Success;
        else
            streamer.emitHistQs(appid, request.symbol, response.Success);

        return { status: 'success' };
    }

    onVix(q) {
        if (q.last !== this.qt_vix.ltp) {
            this.qt_vix.ltt = Date.parse(q.ltt);
            this.qt_vix.ltp = q.last;
            streamer.broadcast('quote', this.qt_vix, 'all_nse_live');
        }
    }
}