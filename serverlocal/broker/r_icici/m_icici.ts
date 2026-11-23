import { BrokerMarketDataImpl } from '../common/m_broker_interface.js';
import { BreezeAdapter } from '../clients/breezeadapter.js';
import { toScrip } from '../../utils/constants.js';

export class ICICIMarketData extends BrokerMarketDataImpl {
    constructor(name: string) {
        super(name);
    }

    async addListeners(): Promise<boolean> {
        this.adapter = await BreezeAdapter.getInstance() as any as BreezeAdapter;
        this.adapter!.addListener('quote', (q: any, appid: string) => {
            this.onQuotes(q, appid);
        });
        return true;
    }

    subscribe(appid: string, symbols: string[], action: string, ...args: any[]): void {
        this.subscriptions.addRequests(appid, symbols);
        this.adapter?.subscribe(symbols, action, ...args);
    }

    subscribeIndices(appid: string, symbol: string) {
        this.subscriptions.addRequests(appid, [symbol, 'VIX']);
        this.adapter?.subscribe([symbol, 'VIX'], 'subs');
    }

    standardize(q: any) {
        let qt = this.symbol_cache.get(q.symbol);
        if (!qt) {
            qt = toScrip(q.symbol);
            this.symbol_cache.set(q.symbol, qt)
        }
        return { ...qt, ...q };
    }

    async history(request: any) {
        if (request.symbol.startsWith('CRUDE'))
            return;

        return await this.historyLocal(request.symbol, request.startTime, request.endTime, request.interval);
    }

    async historyLocal(symbol: string, start: number, end: number, interval: string = '5minute') {
        const response = await this.adapter!.getHistory(symbol, start, end, interval);
        if (!response.Error)
            return response.Success;
        else
            this.log(`historyLocal error ${response.Error}`);

        return [];
    }

    async tearDown(): Promise<any> {

    }

}