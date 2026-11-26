import { TPSocket } from "./adapter.js";
import type { AuthData, Quote } from "../../utils/types.js";
import { NetworkProxy } from "../../utils/networkproxy.js";
import { ConfigService } from "../../service/config/configservice.mjs";

export class ReplaySocket extends TPSocket {
    constructor() {
        super('REPLAYSOCKET', 'tpapp');
    }

    async onAuthData(authData: AuthData) {
        this.authData = authData;
        this.ws = new NetworkProxy(this.name);
        const simulator = ConfigService.getServiceByName('HISTORYSIMULATOR');
        simulator.connect(this.ws);

        this.ws.on('quote', (data: Quote, appid: string) => {
            this.handleMessage(data, appid);
        });

        this.isConnected = true;
        return this.isConnected;
    }

    subscribe(symbols: string[], action: string, ...args: any[]) {
        if (action === 'start')
            this.ws?.send(JSON.stringify({ type: 'session', data: { appid: args[0], action: action, symbols: symbols, simStartTime: args[1], speed: args[2] } }));
        if (action === 'subs' || action === 'unsub')
            this.ws?.send(JSON.stringify({ type: 'subscription', data: { appid: args[0], action: action, symbols: symbols } }));
    }

    onOpen(): void {

    }

    onClose(event) {
        this.log('close', JSON.stringify({ error: event.reason, code: event.code }));
    }

    handleMessage(q: Quote, appid: string): void {
        this.emit('quote', q, appid);
    }
}
