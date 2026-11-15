import { WebServer } from './httpsserver.js';
import { Server } from "socket.io";

export class SocketIO {
    webServer: WebServer | null = null;
    sio: Server | null = null;
    constructor() {

        this.webServer = new WebServer();
        this.webServer.init();

        this.sio = new Server(this.webServer.hServer as any, {
            cors: {
                origin: '*',
                methods: ["GET", "POST"],
            },
            connectionStateRecovery: {
                maxDisconnectionDuration: 3 * 60 * 1000,
                skipMiddlewares: true,
            },
            pingInterval: 30000,
            pingTimeout: 60000
        });
    }

    async start() {
        const { AppClientManager } = await import('../serverlocal/app.mjs');
        const app = new AppClientManager();
        await app.startServices();

        this.sio?.on('connection', (s) => {
            app.connect(s);
        });
    }
}