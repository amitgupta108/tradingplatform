import { WebSocketServer } from 'ws';
import type { App } from '../apps/webapp.js';

export class WSServer {
    wss: WebSocketServer;
    socketmap: Map<string, any> = new Map();

    constructor() {
        this.wss = new WebSocketServer({ port: Number(process.env.PORT3) });
        console.log('WebSocket server is running on ws://localhost:' + process.env.PORT3);
    }

    async start(app: App) {

        this.wss.on('connection', (s) => {
            app.connect(s);
        });
    }
}
