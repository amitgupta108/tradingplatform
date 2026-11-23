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

        this.ws.on('quote', (data: Quote) => {
            this.handleMessage(data);
        });

        this.isConnected = true;
        return this.isConnected;
    }

    subscribe(symbols: string[], action: string, ...args: any[]) {
        if (action === 'start')
            this.ws?.send(JSON.stringify({ type: 'session', data: { action: action, symbols: symbols, simStartTime: args[0], speed: args[1] } }));
        if (action === 'subs' || action === 'unsub')
            this.ws?.send(JSON.stringify({ type: 'subscription', data: { action: action, symbols: symbols } }));
    }

    onOpen(): void {

    }

    handleMessage(q: Quote): void {
        this.emit('quote', q);
    }
}
