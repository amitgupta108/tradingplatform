var https  = require('https');
var express = require('express');
var session = require('express-session');
const fs = require('fs');
const path = require('path');
const { Server } = require("socket.io");

require('console-stamp')(console, '[HH:MM:ss.l]');
const Session = require('./session/session');
const apiserver = require('./apiserver');

// script.js
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

io.engine.use(es);


io.on('connection', (s) => {
    console.log('socket connected ' + s.id);        
    
    var uid = s.handshake.headers.uid;
    var sn = setuser(uid, s);
    s.onAny((event, msg, mode) => {
        console.log("Received event " + event + " with data " + JSON.stringify(msg));
        apiserver.handleMessage(sn, event, msg, mode);
    });
});

function setuser(uid, s)
{
    var sn = Session.sn(uid);
    if(sn === undefined)
        sn = new Session(uid, s); 
    else {
        if(!s.recovered)
            sn.s = s;
        s.emit('restored', uid);
    }
    return sn;
}
