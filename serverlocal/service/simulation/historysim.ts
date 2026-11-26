import { UserService } from "../../../common/service.js";
import { IntervalClock } from "./interval.js";
import { UserQuotes } from "./userquotes.js";
import { NetworkProxy } from "../../utils/networkproxy.js";
import { BreezeAdapter } from "../../broker/clients/breezeadapter.js";

export interface MessageObject {
    appid: string;
    symbols?: string[];
    simStartTime?: number;
    speed?: number;
    action?: string;
}

export class HistorySimulator extends UserService {

    qStore: Map<string, UserQuotes> = new Map();
    historyadapter?: BreezeAdapter;
    clients: Map<string, NetworkProxy> = new Map();

    constructor(name: string) {
        super(name);
    }

    async init(): Promise<{ status: string }> {
        this.historyadapter = await BreezeAdapter.getInstance() as any as BreezeAdapter;
        this.initialized = true;
        return { status: 'success' };
    }

    connect(proxy: NetworkProxy) {
        proxy.responder = this.name;
        proxy.readyState = 1;
        this.clients.set(proxy.requestor, proxy);
        this.setupListeners(proxy);
    }

    setupListeners(client: NetworkProxy) {
        client.addListener('session', (msg: MessageObject) => {
            this.startSession(client, msg)
        });

        client.addListener('speed', (msg: MessageObject) => {
            this.changeSpeed(msg);
        });

        client.addListener('stream', (msg: MessageObject) => {
            this.stream(msg);
        });

        client.addListener('exit', (msg: MessageObject) => {
            this.exit(msg.appid!);
        });
    }

    startSession(client: NetworkProxy, startMsg: MessageObject): void {
        this.qStore.delete(startMsg.appid);  //delete any past unclear session

        const userdata = new UserQuotes(startMsg.appid, client, this.historyadapter);
        this.qStore.set(startMsg.appid, userdata);
        userdata.init(startMsg);

        const clock = IntervalClock.getInstance(startMsg.speed! + 'x');
        clock?.session(startMsg.appid, 'start', userdata.next);
    }

    changeSpeed(msg: MessageObject): void {
        IntervalClock.changeSpeed(msg.appid, msg.speed! + 'x');
    }

    stream(msg: MessageObject): void {
        IntervalClock.streamAction(msg.appid, msg.action!);
    }

    clear(appid: string): { status: string } {
        IntervalClock.getClockForApp(appid)?.session(appid, 'stop');
        this.qStore.delete(appid);
        this.log('Drop user ' + appid);
        return { status: 'success' };
    }

    exit(appid: string): { status: string } {
        return this.clear(appid);
    }

    async tearDown(): Promise<any> {

    }
}