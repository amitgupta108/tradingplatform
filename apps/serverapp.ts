import { App } from '../common/app.js';
import type { WSServer, WebSocket } from '../common/import.js';
import type { EventService } from '../serverlocal/service/system/eventservice.js';
import { ConfigService } from '../serverlocal/service/config/configservice.mjs';
import type { Order, Quote } from '../serverlocal/utils/types.js';
import { Launcher } from '../launch.js'

export class ServerApp extends App {
    wsserver?: WSServer;
    socketmap?: Map<string, { socket: WebSocket, mode: string }>
    es?: EventService;

    constructor(name: string) {
        super(name);
    }

    async init() {
        this.wsserver = Launcher.wsserver();
        this.wsserver!.wss!.on('connection', (s: WebSocket) => {
            this.connect(s);
        });
        this.socketmap = new Map();
    }

    async startServices(name: string[]) {
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
        this.es!.addListener('quote_subsmanager_serverclient', (appid: string, q: Quote) => {
            this.emit(appid, 'quote', q);
        });
        this.es!.addListener('order_subsmanager_serverclient', (appid: string, order: Order) => {
            this.emit(appid, 'order', order);
        });
    }

    connect(s: WebSocket) {
        this.log('Client connected');
        const appid = crypto.randomUUID();

        s.send(JSON.stringify({ type: 'handshake', appid: appid }));
        const profile = { socket: s, mode: 'S5TSABS' } as any;
        this.socketmap?.set(appid, profile);

        this.registerHandlers(s, appid, 'S5TSABS');
    }

    registerHandlers(s: WebSocket, appid: string, mode: string): void {
        s.on('message', (input, isBinary) => {
            const payload = isBinary ? input : input.toString();
            this.log('Received from client: ' + payload);

            const message = JSON.parse(payload as any);
            if (message.appid !== undefined && this.socketmap!.has(message.appid)) {
                const profile = this.socketmap!.get(message.appid);
                if (message.event === 'history')
                    profile!.mode = 'history';

                this.es!.emit('SERVERAPP', message);
            }
            else
                s.close();
        });

        s.on('close', () => {
            this.log('Client disconnected');
        });

        s.on('error', (error: any) => {
            this.error('Socket error:', error);
        });
    }

    send(s: WebSocket, type: string, data: any) {
        s.send(JSON.stringify({ type: type, data: data }));
    }

    emit(appid: string, type: string, data: any) {
        const s = this.socketmap!.get(appid) as { socket: WebSocket, mode: string } | undefined;
        s?.socket.send(JSON.stringify({ type: type, data: data }));
    }

    async tearDown() {
        this.log("Shutting down .....................");

        return true;
    }
}