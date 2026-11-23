import { ConfigService } from '../../service/config/configservice.mjs';
import { BrokerMarketDataImpl } from '../common/m_broker_interface.js';
import { KMDClient } from '../clients/KMDClient.mjs';
import { streamer } from '../../stream.js';

export class KotakMarketDataLive extends BrokerMarketDataImpl {
    constructor(name) {
        super(name);
    }

    async addListeners() {
        this.scrips = ConfigService.getServiceByName('SCRIPSTORE');
        this.adapter = await KMDClient.getInstance();
        this.adapter.addListener('quote', (arg) => this.onQuotes(arg));
        this.adapter.addListener('snapshot', (arg) => this.onSnapshot(arg));
    }

    subscribe(appid, list, action, ...args) {
        action = action === 'start' ? 'subs' : action === 'stop' ? 'unsub' : action;
        this.subscriptions.addRequests(appid, list);
        const requests = this.buildRequests(list);

        if (requests.length > 0)
            this.adapter.subscribe(requests, 'Scrips', action, false);
    }

    subscribeIndices(appid, stockCode) {
        let requests = [];
        if (stockCode === 'NIFTY') {
            requests = ['nse_cm|NIFTY 50', 'nse_cm|INDIA VIX'];
            this.subscriptions.addRequests(appid, [{ 'symbol': 'NIFTY' }, { 'symbol': 'VIX' }]);
            this.symbol_cache.set('NIFTY 50', { symbol: 'NIFTY', exchange: 'nse_cm', stockCode: 'NIFTY', token: 'Nifty 50', key: 'index' });
            this.symbol_cache.set('INDIA VIX', { symbol: 'VIX', exchange: 'nse_cm', stockCode: 'VIX', token: 'INDIA VIX', key: 'vix' });
        }
        if (requests.length > 0)
            this.adapter.subscribe(requests, 'Indices', 'subscribe', false);
    }

    buildRequests(list) {
        const scrips = [];
        list.forEach((e) => {
            const scrip = this.scrips.findScripByRefKey(e.symbol);
            if (scrip !== undefined) {
                e.token = scrip.token;
                e.exchange = scrip.exchangeSegment;
                scrips.push(e.exchange + '|' + e.token);
            }

            if (e.token && e.exchange && this.symbol_cache.get(e.token) === undefined)
                this.symbol_cache.set(e.token, e);
        });
        return scrips;
    }

    snapshot(appid, list) {
        this.my_subs.addRequests(appid, list);
        const requests = this.buildRequests(list);
        this.adapter.snapshot(requests, 'Scrips', false);
    }

    onSnapshot(snapshot) {
        const qt = this.symbol_cache.get(snapshot.token);
        this.emitQuotes(qt);
    }

    standardize(q) {
        const qt = this.symbol_cache.get(q.token.toUpperCase());
        if (qt !== undefined && q.ltp !== undefined) {
            qt.expiry_date = qt.expiry;
            qt.strike_price = qt.strike;
            qt.ltp = q.ltp;
            qt.ltt = q.ltt * 1000;
            qt.yclose = q.close;
            return qt;
        }
    }

    async history(appid, r) {
        const scrip = this.scrips.findScripByRefKey(r.symbol);
        r.scrip = scrip.exchange + '|' + scrip.token;
        if (['nse_cm', 'nse_fo'].includes(scrip.exchange)) {
            const response = await this.adapter.history(r);
            if (response.ok) {
                const qA = await response.json();
                streamer.emitHistQs(appid, r.symbol, qA.data.candles);
                return { status: 'success' };
            }
        }
    }
}