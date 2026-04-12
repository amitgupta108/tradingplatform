var https  = require('https');
var express = require('express');
var session = require('express-session');
const fs = require('fs');
const path = require('path');
const { Server } = require("socket.io");

require('console-stamp')(console, '[HH:MM:ss.l]');
const Session = require('./session/session');
const apiserver = require('./apiserver');
const qserver = require('./quotes');

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
    key: fs.readFileSync(path.join(__dirname, 'certs', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'certs', 'cert.pem')),
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
        maxDisconnectionDuration: 1 * 60 * 1000,
        // whether to skip middlewares upon successful recovery
        skipMiddlewares: true,
      },
    pingInterval: 30000,
    pingTimeout: 30000
});

const liveStocks = new Array(0);
const socketlogging = false;

io.use((s, next) => {
    var uid = s.handshake.auth.token;
    var mode = s.handshake.auth.mode;
    var stockCode = s.handshake.auth.stockCode;
    
    if(mode === 1)
    {
        var usrstpair = liveStocks.find((c) => {return c.stockCode === stockCode});

        if(usrstpair === undefined) {
            liveStocks.push({uid: uid, stockCode: stockCode});
        }
        else if (usrstpair.uid !== uid)
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

    var sn = Session.usn(uid);
    if(sn === undefined){
        sn = new Session(uid, mode);
    } else
    {
        var rStatus = s.recovered ? 'recovered' : 'restored';
        s.emit('prevsession', {uid: uid, socket: rStatus});
    }
    s.sn = sn;
    s.onAny((event, msg) => {
        logSocketEvent("Received event " + event + " with data " + JSON.stringify(msg));
        apiserver.handleMessage(s.sn, event, msg, freeLiveStock);
    });
    
    s.on("disconnect", (reason) => {
        if(['server namespace disconnect', 'client namespace disconnect',
            'server shutting down', 'transport close', 'transport error'].includes(reason))
        {
            logSocketEvent("socket disconnected  " + reason);
        }
    });
});

function freeLiveStock(uid, mode)
{
    var s = qserver.socketmap.get(uid);
    var stockCode = s.handshake.auth.stockCode;
    if(mode === 1){
        var idx = liveStocks.findIndex((c) => c.stockCode === stockCode);
        if(idx !== -1)
            liveStocks.splice(idx, 1);
    }
}

function logSocketEvent(message){
    if(socketlogging)
        console.log(message);
}