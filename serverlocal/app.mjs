import { ConfigService } from './service/config/configservice.mjs';
import { streamer } from './stream.js';
import { apiserver } from './apiserver.mjs';
import { SystemService } from './service/system/service.js';
import { DataApi } from './api/data.js';

class ClientManager extends SystemService {
    constructor(name) {
        super(name);
        this.dataApi = new DataApi();
    }

    startServices() { }
    connect(s) { }
    send() { }
    registerHandlers(s, appid, mode) { }

    catchAsync(requestName, fn) {
        return (...args) => {
            fn.apply(this, args)
                .catch(err => this.error(requestName, err));
        }
    };
}

export class AppClientManager extends ClientManager {
    constructor() {
        super('APPCLIENTMANAGER');
    }

    async startServices() {
        const responses = await ConfigService.initializeAll();
        //await ConfigService.getServiceByName('CONFIGURATIONS').configLoad();
        streamer.init();

        return responses;
    }

    connect(s) {
        const appid = s.handshake.auth.token;
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

    send(s, type, data) {
        s.emit(type, data);
    }

    registerDataHandlers(s) {
        s.on('expiries', (stockCode) => {
            this.send(s, 'expiries', this.dataApi.getExpiries(stockCode, undefined));
        });

        s.on('historyv2', this.catchAsync('historyv2', async (requests) => {
            this.log("history request " + requests.length);
            for (const r of requests) {
                const resp = await this.dataApi.getHistoryAsync(r);
                this.send(s, 'historyv2', { symbol: r.symbol, qA: resp });
            }
        }));
    }

    registerHandlers(s, appid, mode) {
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
}

export class ServerClientManager extends ClientManager {
    constructor() {
        super('SERVERCLIENTMANAGER');
        this.socketmap = new Map();
    }

    startServices() {
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
        this.es.addListener('quote_subsmanager_serverclient', (appid, q) => {
            this.send(appid, 'quote', q);
        });
        this.es.addListener('order_subsmanager_serverclient', (appid, order) => {
            this.send(appid, 'order', order);
        });
    }

    connect(s) {
        this.log('Client connected');
        const appid = crypto.randomUUID();

        s.send(JSON.stringify({ type: 'handshake', appid: appid }));
        const profile = { socket: s, mode: 'S5TSABS' };
        this.socketmap.set(appid, profile);

        s.on('message', (input, isBinary) => {
            const payload = isBinary ? input : input.toString();
            this.log('Received from client: ' + payload);

            const message = JSON.parse(payload);
            if (message.appid !== undefined && this.socketmap.has(message.appid)) {
                const profile = this.socketmap.get(message.appid);
                if (message.event === 'history')
                    profile.mode = 'history';

                this.es.emit('SERVERAPP', message);
            }
            else
                s.close();
        });

        s.on('close', () => {
            this.log('Client disconnected');
        });

        s.on('error', (error) => {
            this.error('Socket error:', error);
        });
    }

    send(appid, type, data) {
        const s = this.socketmap.get(appid);
        s?.send(JSON.stringify({ type: type, data: data }));
    }
}