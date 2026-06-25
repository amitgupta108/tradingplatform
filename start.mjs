import consoleStamp from 'console-stamp';
consoleStamp(console, { format: ':date(HH:MM:ss.l)' });

import { fileURLToPath } from 'node:url';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import https from 'node:https';
import { error } from 'node:console';
import { Server } from "socket.io";
import { hot } from 'hot-hook';

process.on('uncaughtException', (err) => {
    console.error('FATAL: Uncaught Exception ', err);
    //setTimeout(() => process.exit(1), 5000); 
});

process.on('unhandledRejection', (event) => {
    console.log('Unhandled promise, reason ', + JSON.stringify(event));
});

const http_impl = express();
http_impl.use(express.static(path.join(__dirname, '.', 'web')));
http_impl.use(express.json());

const options = {
    key: readFileSync(path.join(__dirname,'serverlocal', 'config', 'server.key'), 'utf8'),
    cert: readFileSync(path.join(__dirname, 'serverlocal', 'config', 'server.crt'), 'utf8'),
};

const args = process.argv;
console.log(`First argument: ${args[2]}`);
const port = args[2] === undefined ? 80 : Number(args[2]);

const httpsServer = https.createServer(options, http_impl);
httpsServer.listen(port, () => {
    console.log(`Server running at https://127.0.0.1:${port}/`);
});

const io = new Server(httpsServer, {
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

const handler = await import('./serverlocal/app.mjs', import.meta.hot?.boundary);

io.on('connection', (s) => {
    
    reload: async () => {
        try {
            if (import.meta.hot) {
                handler = await import('./serverlocal/app.mjs', import.meta.hot?.boundary);
            
                console.log('[HMR] Swap completed successfully.');
            }
        } catch (err) {
            console.log('[HMR] Reload aborted: ' + err.message);
        }
    },
    handler.handleConnection(s);
});