import { SystemService } from './service/system/service.js';
import { ConfigService } from './service/config/configservice.mjs';
import { EventService } from './service/system/eventservice.js';

interface UserMapEntry {
    socket: any;
    mode: string;
}

class StreamingService extends SystemService {
    usermap: Map<string, UserMapEntry>;
    constructor(name: string) {
        super(name);
        this.usermap = new Map();
    }

    async init() {
        const es = ConfigService.getServiceByName('EVENTSERVICE') as EventService;
        es.addListener('ordersim', (order: any) => {
            this.send('order', order);
        });
        this.initialized = true;
        return { status: 'initialized' };
    }

    emitOrders(order: any): void {
        this.send('order', order);
    }

    emitQs(q: any): void {
        this.send('quote', q);
    }

    emitHistQs(appid: string, symbol: string, qA: any) {
        const app_obj = this.getFromUserMap(appid);
        if (app_obj !== undefined)
            this.finalEmit(app_obj.socket, 'history', { symbol: symbol, qA: qA });
    }

    private send(type: string, msg: any) {
        const app_obj = this.getFromUserMap(msg.appid);
        if (app_obj !== undefined)
            this.finalEmit(app_obj.socket, type, msg);
        else
            this.group_emit(type, msg);
    }

    private group_emit(type: string, msg: any) {
        const receivers = this.getReceivers(type, msg);
        receivers.forEach((appid: string) => {
            msg.appid = appid;
            this.finalEmit(this.getFromUserMap(appid)?.socket, type, msg);
        });
    }

    private getReceivers(type: string, msg: any): string[] {
        const receivers: string[] = [];
        if (type === 'order') {
            for (const [k, v] of this.usermapEntries()) {
                if (msg.modes.includes(v.mode))
                    receivers.push(k);
            }
        }
        return receivers;
    }

    broadcast(type: string, msg: any, group?: string) {
        for (const [k, v] of this.usermapEntries()) {
            this.finalEmit(v.socket, type, msg);
        }
    }

    private finalEmit(s: any, type: string, msg: any): void {
        s.emit(type, msg);
    }

    addToUserMap(appid: string, app_obj: UserMapEntry): void {
        this.usermap.set(appid, app_obj);
    }

    getFromUserMap(appid: string): UserMapEntry | undefined {
        return this.usermap.get(appid);
    }

    deleteFromUserMap(appid: string): void {
        this.usermap.delete(appid);
    }

    private usermapEntries(): IterableIterator<[string, UserMapEntry]> {
        return this.usermap.entries();
    }

}

export const streamer = new StreamingService('STREAMSERVICE');