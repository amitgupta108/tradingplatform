import consoleStamp from 'console-stamp';
consoleStamp(console, { format: ':date(HH:MM:ss)' });

import { fileURLToPath } from 'node:url';
import {readFileSync} from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from 'express';
import session from 'express-session';
import https from 'node:https';
import { Server } from "socket.io";
import Session from './session/session.mjs';
import iBreeze from './broker/breeze.mjs';
import iKNeo from './broker/kotakneo.mjs';
import qserver from './quotes.mjs'; 
import apiserver from './apiserver.mjs'; 

const args = process.argv;

console.log(`Node executable path: ${args[0]}`);
console.log(`Script file path: ${args[1]}`);
console.log(`First argument: ${args[2]}`);
console.log(`Second argument: ${args[3]}`);

var port = args[2] === undefined ? 80 : Number(args[2]);

const es = session({secret: '72r5N3K05754+43ek796960QT96Hc8e1', 
        resave: true,
        saveUninitialized: true,});

const app = express();
app.use(express.static('web/'));
app.use(express.json());
app.use(es);

const options = {
    key: readFileSync(path.join(__dirname, 'certs', 'key.pem'), 'utf8'),
    cert: readFileSync(path.join(__dirname, 'certs', 'cert.pem'), 'utf8'),
};

const httpsServer = https.createServer(options, app);
httpsServer.listen(port, () => {
    console.log(`Server running at https://localhost:${port}/`);
});

const io = new Server(httpsServer, {
    cors: {
        origin: "*",
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

const us = new Array(0);

io.use((s, next) => {
    var uid = s.handshake.auth.token;
    var mode = s.handshake.auth.mode;
    var stockCode = s.handshake.auth.stockCode;
    
    if(mode === 1)
    {
        const idx = us.findIndex((s) => {return s.mode === mode && s.stockCode === stockCode});
        if(idx !== -1 && us[idx].uid !== uid)
            next(new Error('Live mode for this user not available'));
    }
    next();
});
//io.use(es);

io.on('connection', (s) => {
    
    const uid = s.handshake.auth.token;
    const mode = s.handshake.auth.mode;
    const stockCode = s.handshake.auth.stockCode;

    console.log('user connected with socket ' + uid + ' ' + s.id);        
    qserver.socketmap.set(uid, s);
    var sn = us.find((e) => {
        return e.mode === mode 
         && e.stockCode === stockCode
        && e.uid === uid});

    if(sn === undefined){
        sn = new Session(uid, mode, stockCode);
        us.push(sn);
    } else
    {
        if(!(sn.status === 'initialized' || sn.status === 'stopped'))
            s.emit('prevsession', sn.status);
        console.log('prevsession ' +  uid + ' ' + s.recovered + ' ' + sn.status);
    }
    s.sn = sn;
    s.onAny((event, msg) => {
        console.log("Received event " + event + " with data " + JSON.stringify(msg));
        apiserver.handleMessage(s.sn, event, msg);
    });
    
    s.on("disconnect", (reason) => {
        if(reason === 'client namespace disconnect')
        {
            exit(sn.uid, sn.mode);
            console.log('user exited:' + sn.uid);
            qserver.socketmap.delete(sn.uid);
            snDestroy(uid);
        }
        else if(['server namespace disconnect',
            'server shutting down', 'transport close', 'transport error'].includes(reason))
        {
            console.log("socket disconnected  " + reason);
        }
    });
});

function exit(uid, mode)
{
    iBreeze.exit(uid);
    if(mode === 1)
        iKNeo.exit(uid);
}

function snDestroy(uid)
{
    var idx = us.findIndex((e) => e.uid === uid);
    us.splice(idx, 1);
}