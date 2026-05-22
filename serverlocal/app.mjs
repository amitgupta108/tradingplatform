import consoleStamp from 'console-stamp';
consoleStamp(console, { format: ':date(HH:MM:ss)' });

import { fileURLToPath } from 'node:url';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import https from 'node:https';
import { Server } from "socket.io";
import ScripServer from './service/scrip.mjs';
import Session from './session/session.mjs';
import kotak_socket from './broker/brokerws.mjs';
import qserver from './quotes.mjs'; 
import apiserver from './apiserver.mjs'; 
import { error } from 'node:console';

if(!global.server)
{
    const args = process.argv;

    console.log(`First argument: ${args[2]}`);
    console.log(`Second argument: ${args[3]}`);

    const port = args[2] === undefined ? 80 : Number(args[2]);
    if(args[3] !== undefined)
        kotak_socket.wsOps('connect', args[3]);

    const app = express();
    app.use(express.static('web/'));
    app.use(express.json());

    const options = {
        key: readFileSync(path.join(__dirname, 'certs', 'key.pem'), 'utf8'),
        cert: readFileSync(path.join(__dirname, 'certs', 'cert.pem'), 'utf8'),
    };

    const httpsServer = https.createServer(options, app);
    httpsServer.listen(port, () => {
        console.log(`Server running at https://127.0.0.1:${port}/`);
    });

    const io = new Server(httpsServer, {
        cors: {
            origin: `https://127.0.0.1:${port}`,
            methods: ["GET", "POST"],
        },
        connectionStateRecovery: {
            maxDisconnectionDuration: 3 * 60 * 1000,
            // whether to skip middlewares upon successful recovery
            skipMiddlewares: true,
        },
        pingInterval: 30000,
        pingTimeout: 30000
    });

    ScripServer.start();

    io.on('connection', (s) => {
        
        const appid = s.handshake.auth.token;
        const mode = s.handshake.auth.mode;
        const stockCode = s.handshake.auth.stockCode;

        console.log('user connected with socket ' + appid + ' ' + s.id);                
        qserver.socketmap.set(appid, {socket: s, mode: mode, stockCode: stockCode});        

        const i_appid = mode === 0 ? appid : stockCode + mode;
        let sn = Session.sn(i_appid);

        if(sn === undefined)
            sn = new Session(appid, mode, stockCode);
        else
        {    
            sn.shared_with.set(appid, sn);
            if(sn.status === 'streaming')
                s.emit('prevsession', sn.status);
        }
        s.sn = sn;

        s.onAny((event, msg) => {
            console.log("Received event " + event + " with data " + JSON.stringify(msg));
            apiserver.handleMessage(s, appid, event, msg);
        });
        
        s.on("disconnect", (reason) => {
            if(reason === 'client namespace disconnect')
            {
                Session.exit(appid, sn);
                qserver.socketmap.delete(appid);
                apiserver.exit(appid);
                console.log('user exited:' + appid);
            }
            else if(['server namespace disconnect',
                'server shutting down', 'transport close', 'transport error'].includes(reason))
            {
                console.log("socket disconnected  " + reason);
            }
        });
    });
    global.server = true;
}