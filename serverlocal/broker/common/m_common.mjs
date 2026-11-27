import { streamer } from '../../stream.js';
import { BrokerMarketDataImpl } from './m_broker_interface.js';
import { ConfigService } from '../../service/config/configservice.mjs';
import { EXCHANGES } from '../../utils/constants.js';
import { TPRemoteAdapter } from '../clients/TPRemote.js';

export class CommonService extends BrokerMarketDataImpl {
    constructor(name) {
        super(name);
    }

    async addListeners() {
        this.adapter = await TPRemoteAdapter.getInstance();
        this.adapter.addListener('quote', (arg) => this.onQuotes(arg));
    }

    async tpExpiries(stockCode) {
        this.adapter = await TPRemoteAdapter.getInstance();
        if (this.adapter.isConnected)
            return await this.adapter.getExpiries(stockCode);
    }

    async tpScrips(filters) {
        this.adapter = await TPRemoteAdapter.getInstance();
        if (this.adapter.isConnected)
            return await this.adapter.getScrips(filters);
    }

    async tpValues(provider) {
        this.adapter = await TPRemoteAdapter.getInstance();
        if (this.adapter.isConnected)
            return await this.adapter.getValues(provider);
    }

    async tpHistory(request) {
        this.adapter = await TPRemoteAdapter.getInstance();
        if (this.adapter.isConnected)
            return await this.adapter.getHistory(request);
    }

    async history(request, appid) {
        if (EXCHANGES[request.stockCode] === 'mcx_fo')
            return;

        let response;
        if (process.env.PTFETCH_HISTORY === 'Y')
            response = (await this.tpHistory(request)).history;
        else
            response = await this.historyLocal(request, appid);

        if (response.length === 0)
            return { status: 'error', reason: 'history fetch error' };
        else if (appid === undefined)
            return response;
        else
            streamer.emitHistQs(appid, request.symbol, response);

        return { status: 'success' };
    }

    async historyLocal(request, appid) {
        const s = ConfigService.getServiceByName('ICICIHISTVIEW');
        const response = await s.getHistory(appid, request);
        if (!response.Error)
            return response.Success;
        else
            this.log(`historyLocal error ${response.Error}`);

        return [];
    }

    onVix(q) {
        if (q.last !== this.qt_vix.ltp) {
            this.qt_vix.ltt = Date.parse(q.ltt);
            this.qt_vix.ltp = q.last;
            streamer.broadcast('quote', this.qt_vix, 'all_nse_live');
        }
    }
}