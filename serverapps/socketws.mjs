import { WebSocketServer } from 'ws';

export class WSServer
{
    constructor() {
        this.wss = new WebSocketServer({ port: 1030 });
        console.log('WebSocket server is running on ws://localhost:1030');

        this.socketmap = new Map();
    }

    async start() 
    {
        const { ServerClientManager } = await import('../serverlocal/app.mjs');
        const app = new ServerClientManager();
        app.startServices();

        this.wss.on('connection', (s) => {
            app.connect(s);
        });
    }
}
