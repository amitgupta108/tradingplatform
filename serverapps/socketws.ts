import { WebSocketServer } from 'ws';

export class WSServer {
    wss: WebSocketServer;
    socketmap: Map<string, any> = new Map();

    constructor() {
        this.wss = new WebSocketServer({ port: Number(process.env.PORT3) });
        console.log('WebSocket server is running on ws://localhost:' + process.env.PORT3);
    }

    async start() {
        const { WebApp } = await import('../apps/webapp.js');
        const app = new WebApp();
        await app.startServices();

        this.wss.on('connection', (s: any) => {
            app.connect(s);
        });
    }
}