import { httpServer } from './httpsserver.mjs';
import { Server } from "socket.io";

export const socketio = (host, port) => {
    
    httpServer.listen(port, host, () => {
        console.log(`Server running at http://${host}:${port}/`);
    });

    return new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ["GET", "POST"],
        },
        connectionStateRecovery: {
            maxDisconnectionDuration: 3 * 60 * 1000,
            skipMiddlewares: true,
        },
        pingInterval: 30000,
        pingTimeout: 30000
    });
}