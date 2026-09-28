import { WebSocketServer } from 'ws';

export class WSServer
{
    constructor() {
        this.wss = new WebSocketServer({ port: process.env.PORT3 });
        console.log('WebSocket server is running on ws://localhost:' + process.env.PORT3);

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
