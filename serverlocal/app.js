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

var port = args[2] === undefined ? 443 : Number(args[2]);

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
    pingInterval: 30000,
    pingTimeout: 30000
});

const liveStocks = new Array(0);

io.use((s, next) => {
    var uid = s.handshake.auth.token;
    var mode = s.handshake.auth.mode;
    var stockCode = s.handshake.auth.stockCode;
    
    if(mode === 1)
        if(liveStocks.includes(stockCode))
            next(new Error('Live mode for this not available'));
        else
            liveStocks.push(stockCode);
    next();
})
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
        s.emit(rStatus, uid);
    }
    s.onAny((event, msg) => {
        console.log("Received event " + event + " with data " + JSON.stringify(msg));
        apiserver.handleMessage(sn, event, msg);
    });

    s.on("disconnect", (reason) => {
        if(['server namespace disconnect', 'client namespace disconnect',
            'server shutting down', 'transport close', 'transport error'].includes(reason))
        {
            console.log("socket disconnected  " + reason);
            apiserver.disconnect(uid, mode);
            Session.destroy(uid);
            qserver.socketmap.delete(uid);
            
            if(mode === 1){
                var idx = liveStocks.findIndex((e) => e === stockCode);
                liveStocks.splice(idx, 1);
            }
        }
    });
});