import { HTTPServer } from './httpsserver.js';
import { Server } from "socket.io";

export class SocketIO {
    webServer: HTTPServer | null = null;
    sio: Server | null = null;

    constructor(options?: any) {
        this.webServer = new HTTPServer(options);

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
}