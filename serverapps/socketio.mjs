import { httpsServer } from './httpsserver.mjs';
import { Server } from "socket.io";

export const socketio = (port) => {
    
    httpsServer.listen(port, () => {
        console.log(`Server running at https://127.0.0.1:${port}/`);
    });

    return new Server(httpsServer, {
        cors: {
            origin: `https://localhost:${port}`,
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