import { WebSocketServer } from 'ws';

export class WSServer {
    wss: WebSocketServer;
    socketmap: Map<string, any> = new Map();

    constructor() {
        this.wss = new WebSocketServer({ port: Number(process.env.PORT3) });
        console.log('WebSocket server is running on ws://localhost:' + process.env.PORT3);
    }

    async start() {
        const { ServerClientManager } = await import('../serverlocal/app.mjs');
        const app = new ServerClientManager();
        await app.startServices();

        this.wss.on('connection', (s) => {
            app.connect(s);
        });
    }
}
