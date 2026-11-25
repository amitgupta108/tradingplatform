import { ReplaySocket } from '../clients/replaysocket.js';
import { BrokerMarketDataImpl } from '../common/m_broker_interface.js';

export class TPMarketReplay extends BrokerMarketDataImpl {

    constructor(name: string) {
        super(name);
    }

    async addListeners(): Promise<boolean> {
        this.adapter = await ReplaySocket.getInstance();
        this.adapter.addListener('quote', (q: any, appid: string) => {
            this.onQuotes(q, appid);
        });
        return true;
    }

    subscribe(appid: string, symbols: string[], action: string, ...args: any[]): void {
        this.subscriptions.addRequests(appid, symbols);
        this.adapter!.subscribe(symbols, action, appid, ...args);
    }

    subscribeIndices(appid: string, symbol: string): void {
        this.subscriptions.addRequests(appid, [symbol, 'VIX']);
        this.adapter!.subscribe([symbol, 'VIX'], 'subs', appid);
    }

    standardize(q: any) {
        return { ...this.getScrip(q.symbol), ...q };
    }

    async tearDown(): Promise<any> {

    }
}