import { Generic } from '../../../generic.js';
import { NetworkProxy } from '../../utils/networkproxy.js';
import { BreezeAdapter } from '../../broker/clients/breezeadapter.js';
import type { MessageObject } from './historysim.js';
import type { Quote } from '../../utils/types.js';

export class UserQuotes extends Generic {
    appid: string;
    symbols: string[] = [];
    startTime: number = 0;
    currentTime: number = 0;
    qCollection?: Map<string, { currentIdx: number, quotes: Quote[] }>
    next = (event: string, value: any) => {
        this.processEvent(event, value);
    }
    adapter: BreezeAdapter;
    client: NetworkProxy;
    constructor(appid: string, client: NetworkProxy, adapter: any) {
        super('USERQUOTES_' + appid);
        this.appid = appid;
        this.adapter = adapter;
        this.client = client;
        this.qCollection = new Map<string, { currentIdx: number, quotes: Quote[] }>();
        this.client.addListener('subscription', (msg: MessageObject) => {
            this.subscribe(msg.symbols!, msg.action!);
        });
    }

    init(startMsg: MessageObject) {
        this.startTime = startMsg.simStartTime!;
        this.currentTime = this.startTime;
        this.symbols = startMsg.symbols!;
        this.subscribe(this.symbols, 'subs');
    }

    subscribe(symbols: string[], action: string) {
        if (action === 'subs')
            this.addRequests(symbols);
        else
            this.removeRequests(symbols);
    }

    addRequests(symbols: string[]) {
        this.symbols.push(...symbols);
        this.symbols = [...new Set(this.symbols)];
        for (const s of symbols) {
            if (!this.qCollection!.has(s))
                this.qCollection!.set(s, { currentIdx: 0, quotes: new Array<Quote>() });
        }
    }

    getRequests(): string[] {
        return this.symbols;
    }

    removeRequests(symbols: string[]): void {
        this.symbols = this.symbols?.filter(s => !symbols.includes(s));
    }

    private q(symbol: string, time: number): Quote | undefined {
        const reloadthreshold = 80;
        const qs = this.qCollection!.get(symbol);
        if (qs!.quotes.length - qs!.currentIdx < reloadthreshold)
            this.loadQuotes(symbol, this.currentTime);

        for (let i = qs!.currentIdx; i < qs!.quotes.length; i++) {
            if (qs!.quotes[i].ltt === time) {
                qs!.currentIdx = i + 1;
                return qs!.quotes[i];
            }
        }
        return undefined;
    }

    private async loadQuotes(symbol: string, time: number): Promise<void> {
        try {
            const response = await this.adapter.getHistory(symbol, time, this.nextTime(time), '1second');
            if (response.Error === null)
                this.processResults(symbol, response.Success as any[]);
            else
                this.log('load failed for: ' + symbol + ' ' + response.Error);
        } catch (exception: any) {
            this.log('Error loading quotes for: ' + symbol + ' ' + exception);
        }
    }

    private processResults(symbol: string, qs: any[]) {
        const quotes = qs.map((q: any) => {
            const { close: ltp, datetime: ltt, ...rest } = q;
            return Object.assign({ symbol, ltp, ltt: this.parseDate(ltt) } as Quote);
        })
        this.qCollection!.get(symbol)?.quotes.push(...quotes);
    }

    private nextTime(currentTime: number) {
        const today = new Date(currentTime);
        if (!(today.getHours() >= 15 && today.getMinutes() > 35))
            return currentTime += 16 * 60 * 1000;
        else if (today.getDay() !== 5)
            return currentTime += (17 * 60 + 35) * 60 * 1000;
        else
            return currentTime += ((2 * 24 * 60) + (17 * 60 + 35)) * 60 * 1000;
    }

    private processEvent(event: string, value: any) {
        if (event === 'tick') {
            for (const symbol of this.symbols) {
                let q = this.q(symbol, this.currentTime);
                if (q !== undefined)
                    this.client?.send(JSON.stringify({ type: 'quote', data: q, appid: this.appid }));
            }
            this.currentTime += 1000;
        }
    }

    // Example input: "2026-11-21 08:38:15"
    private parseDate(str: string) {
        const year = (str.charCodeAt(0) - 48) * 1000 +
            (str.charCodeAt(1) - 48) * 100 +
            (str.charCodeAt(2) - 48) * 10 +
            (str.charCodeAt(3) - 48);
        const month = (str.charCodeAt(5) - 48) * 10 + (str.charCodeAt(6) - 48) - 1; // 0-indexed
        const day = (str.charCodeAt(8) - 48) * 10 + (str.charCodeAt(9) - 48);
        const hour = (str.charCodeAt(11) - 48) * 10 + (str.charCodeAt(12) - 48);
        const min = (str.charCodeAt(14) - 48) * 10 + (str.charCodeAt(15) - 48);
        const sec = (str.charCodeAt(17) - 48) * 10 + (str.charCodeAt(18) - 48);

        // Returns a raw epoch timestamp (number)
        return Date.UTC(year, month, day, hour, min, sec);
    }
}