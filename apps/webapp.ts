import WebSocket from "ws";
import { Socket } from "socket.io";
import { MessagePort } from "node:worker_threads";
import { SystemService } from "../serverlocal/service/system/service.js";
import { DataApi } from "../serverlocal/api/data.js";

export abstract class App extends SystemService {
    dataApi: DataApi;

    constructor(name: string) {
        super(name);
        this.dataApi = new DataApi();
    }

    abstract startServices(names?: string[]): Promise<any>;
    abstract connect(s: Socket | WebSocket | MessagePort, id?: string): void;
    abstract send(s: Socket | WebSocket | MessagePort, type: string, data: any): void;
    abstract registerHandlers(s: Socket | WebSocket | MessagePort, appid: string, mode: string): void;

    catchAsync(requestName: string, fn: (...args: any[]) => Promise<any>) {
        return (...args: any[]) => {
            fn.apply(this, args)
                .catch(err => this.error(requestName, err));
        }
    };
}

import { ConfigService } from "../serverlocal/service/config/configservice.mjs";
import { apiserver } from "../serverlocal/apiserver.mjs";
import { streamer } from "../serverlocal/stream.js";

export class WebApp extends App {
    constructor() {
        super('WEBAPP');
    }

    async startServices() {
        const responses = await ConfigService.initializeAll();
        streamer.init();

        return responses;
    }

    connect(s: Socket) {
        const appid = s.handshake.auth.appid;
        const mode = s.handshake.auth.mode;

        const as = ConfigService.getServiceByName('AUTHSERVICE');
        const matches = as.validate(appid, mode)
        if (matches.length === 1) {
            console.log('app not authenticated');
            return;
        }

        this.registerDataHandlers(s);
        streamer.addToUserMap(appid, { socket: s, mode: mode });
        this.registerHandlers(s, appid, mode);

        s.on("error", (err) => {
            console.error(`[Global Error]  Socket ${s.id}:`, err.message);
        });
    }

    send(s: Socket, type: string, data: any) {
        s.emit(type, data);
    }

    registerDataHandlers(s: Socket) {
        s.on('expiries', async (stockCode: string) => {
            this.send(s, 'expiries', await this.dataApi.getExpiries({ stockCode: stockCode }));
        });

        s.on('historyv2', this.catchAsync('historyv2', async (requests) => {
            this.log("history request " + requests.length);
            for (const r of requests) {
                const resp = await this.dataApi.getHistory(r, undefined);
                this.send(s, 'historyv2', { symbol: r.symbol, qA: resp });
            }
        }));
    }

    registerHandlers(s: Socket, appid: string, mode: string) {
        const profile = ConfigService.getProfile(mode);

        if (Object.hasOwn(profile, 'view'))
            apiserver.registerDataRequests(s, appid, mode);

        if (Object.hasOwn(profile, 'trade'))
            apiserver.registerTradeRequests(s, appid, mode);

        if (Object.hasOwn(profile, 'admin'))
            apiserver.registerAdminRequests(s, appid, mode);

        apiserver.registerDisconnectionHandler(s, appid, mode);
        this.registerAuthorizer(s, mode);
    }

    registerAuthorizer(s, mode) {
        s.use(([eventName, ...args], next) => {
            const implementedEvents = s.eventNames();

            if (!implementedEvents.includes(eventName))
                return next(new Error(`Unsupported event: ${eventName}`));

            const auth = ConfigService.getServiceByName('AUTHSERVICE');
            if (!auth.checkAccess(eventName, mode))
                return next(new Error("Unauthorized access to admin resource"));

            next();
        });
    }

    async tearDown() {
        this.log("Shutting down .....................");
        await ConfigService.getServiceByName('EVENTSERVICE').triggerImmediate('TEARDOWN');
    }
}