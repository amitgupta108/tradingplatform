import { IncomingMessage, ServerResponse } from 'node:http';
import { App } from "../common/app.js";
import { Socket } from "../common/import.js";
import { SocketIO } from "../common/import.js";

import { ConfigService } from "../serverlocal/service/config/configservice.mjs";
import { apiserver } from "../serverlocal/apiserver.mjs";
import { streamer } from "../serverlocal/stream.js";
import { DataApi } from "../serverlocal/api/data.js";

export class WebApp extends App {
    server?: SocketIO;
    dataApi?: DataApi;
    apiHandler?: (req: IncomingMessage, res: ServerResponse) => void;

    constructor(name: string) {
        super(name);
    }

    async init(server: SocketIO) {
        this.server = server;
        this.server!.sio!.on('connection', (s: Socket) => {
            this.connect(s);
        });

        this.server.webServer?.setHandler(this.apiHandler);
        await this.startServices();
    }

    async tearDown() {
        this.log("Shutting down .....................");
        await ConfigService.getServiceByName('EVENTSERVICE').triggerImmediate('TEARDOWN');
    }

    async startServices() {
        const responses = await ConfigService.initializeAll();
        streamer.init();
        this.dataApi = new DataApi();
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

    handleHttpRequest(req: IncomingMessage, res: ServerResponse) {
        if (req.url?.startsWith('/redirect'))
            this.handleContentRequest(req, res);
        else if (req.url?.startsWith('/api'))
            this.handleAPIRequest(req, res);
    }

    private registerDataHandlers(s: Socket) {
        s.on('expiries', async (stockCode: string) => {
            this.send(s, 'expiries', await this.dataApi!.getExpiries({ stockCode: stockCode }));
        });

        s.on('historyv2', this.catchAsync('historyv2', async (requests) => {
            this.log("history request " + requests.length);
            for (const r of requests) {
                const resp = await this.dataApi!.getHistory(r, undefined);
                this.send(s, 'historyv2', { symbol: r.symbol, qA: resp });
            }
        }));
    }

    private registerAuthorizer(s: Socket, mode: string) {
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

    private handleContentRequest(req: IncomingMessage, res: ServerResponse) {
        if (req.url === ('/redirect/icici.html')) {
            const authcode = new URLSearchParams(req.url?.split('?')[1]).get('apisession') as string;
            const es = ConfigService.getServiceByName('EVENTSERVICE');
            es.emit('ext_auth', { provider: 'icici', authcode: authcode });
        }

        const responseType = 'text/html';
        res.writeHead(200, { 'Content-Type': responseType });
        res.end('<!DOCTYPE html><title>Redirect</title><label onclick="window.close()">X</label>', 'utf-8');
    }

    private async handleAPIRequest(req: IncomingMessage, res: ServerResponse) {
        res.setHeader('Content-Type', 'application/json');
        const as = ConfigService.getServiceByName('AUTHSERVICE');
        const headers = req.headers;
        const profile = as.validate(headers['sid'], headers['token']);

        if (profile === undefined) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Unauthorized' }));
        }
        else {
            let wrapper: any;
            if (req.url === '/api/value' && req.method === 'POST') {
                const jsonbody = await this.getRequestBody(req) as { provider: string };
                wrapper = await this.dataApi?.getValues(jsonbody?.provider);
            }
            else if (req.url === '/api/scrips' && req.method === 'POST') {
                const jsonbody = await this.getRequestBody(req) as { filters: any };
                wrapper = await this.dataApi?.getScrips(jsonbody?.filters);
            }
            else if (req.url === '/api/history' && req.method === 'POST') {
                const jsonbody = await this.getRequestBody(req) as { request: any };
                wrapper = await this.dataApi?.getHistory(jsonbody?.request, undefined);
            }
            else if (req.url === '/api/expiries' && req.method === 'POST') {
                const jsonbody = await this.getRequestBody(req) as { options: any };
                wrapper = await this.dataApi?.getExpiries(jsonbody?.options);
            }
            res.writeHead(200);
            res.end(JSON.stringify(wrapper));
        }
    }

    private getRequestBody(req: IncomingMessage) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (err) {
                    reject(err);
                }
            });
        });
    }
}