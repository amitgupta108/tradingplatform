import { BrokerMarketDataImpl } from '../common/m_broker_interface.js';
import { BreezeAdapter } from '../clients/BreezeAdapter.js';
import { streamer } from '../../stream.js';

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
    }

    async history(request: any, appid?: string) {
        if (request.symbol.startsWith('CRUDE'))
            return;

        let response = await this.historyLocal(request.symbol, request.startTime, request.endTime, request.interval);
        if (response.length === 0)
            return { status: 'error', reason: 'history fetch error' };
        else if (appid === undefined)
            return response;
        else
            streamer.emitHistQs(appid, request.symbol, response);

        return { status: 'success' };
    }

    async historyLocal(symbol: string, start: number, end: number, interval: string = '5minute') {
        const response = await this.adapter!.getHistory(symbol, start, end, interval);
        if (!response.Error)
            return response.Success;
        else
            this.log(`historyLocal error ${response.Error}`);

        return [];
    }

}