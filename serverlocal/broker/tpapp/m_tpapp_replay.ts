import { ReplaySocket } from '../clients/replaysocket.js';
import { BrokerMarketDataImpl } from '../common/m_broker_interface.js';

export class TPMarketReplay extends BrokerMarketDataImpl {

    constructor(name: string) {
        super(name);
    }

    async addListeners(): Promise<boolean> {
        this.adapter = await ReplaySocket.getInstance();
        this.adapter.onQuote = (q: any, appid: string) => {
            this.onQuotes(q, appid);
        };
        return true;
    }

    subscribe(appid: string, symbols: string[], action: string, ...args: any[]): void {
        this.subscriptions.addRequests(appid, symbols);
        this.adapter!.subscribe(symbols, action, ...args);
    }

    subscribeIndices(appid: string, symbol: string): void {
        this.subscriptions.addRequests(appid, [symbol, 'VIX']);
        this.adapter!.subscribe(appid, [symbol, 'VIX'], 'subs');
    }

    standardize(q: any): any {
    }
}