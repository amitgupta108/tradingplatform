import { hServer } from './httpsserver.mjs';
import { Server } from "socket.io";

export class SocketIO
{
    constructor()
    {
        this.sio = new Server(hServer, {
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

    async start()
    {
        const {AppClientManager} = await import('../serverlocal/app.mjs');
        const app = new AppClientManager();
        app.startServices();

        this.sio.on('connection', (s) => {
            app.connect(s);
        });
    }
}