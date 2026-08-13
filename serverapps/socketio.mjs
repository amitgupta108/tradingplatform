import { httpsServer } from './httpsserver.mjs';
import { httpServer } from './httpsserver.mjs';
import { Server } from "socket.io";

export const socketio = (host, port) => 
{
    const hServer = process.env.HTTP === 'Y' ? httpServer : httpsServer;    
    const protocol = process.env.HTTP === 'Y' ? 'http' : 'https';
    if(port === undefined || port === 0 || port < 1025)
        port = process.env.PORT1;

    hServer.listen(port, host, () => {
        console.log(`Server running at ${protocol}://${host}:${port}/`);
    });

    return new Server(hServer, {
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