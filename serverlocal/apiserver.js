var https  = require('https');
var express = require('express');
var session = require('express-session');
const fs = require('fs');
const path = require('path');
const { Server } = require("socket.io");
const iBreeze = require('./broker/breeze');
const Session = require('./session/session');
const ordersocket = require('./broker/ordernotifier');
require('console-stamp')(console, '[HH:MM:ss.l]');
var port = 80;

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
    s.onAny((event, msg) => {
        console.log("Received event " + event + " with data " + JSON.stringify(msg));
        handleMessage(sn, event, msg);
    });
});

function setuser(uid, s)
{
    var sn = Session.sn(uid);
    if(sn === undefined)
    {
        cg = {  
            simTime: 0,
            speed: 1,
            interval: 990,
            qsid: 0,
        };
        sn = new Session(uid, s, cg); 
    } else {
        if(!s.recovered)
            sn.s = s;
        s.emit('restored', uid);
    }
    return sn;
}

async function handleMessage(sn, event, msg)
{
    try {
        switch(event)
        {
            case 'restored':
                if (response.continue === true)
                    sn.inqsub();
                break;
            case 'preData':
                console.log("Pre data request " + new Date(msg.startTime));

                var preUq = iBreeze.preU(msg);
                var prefq = iBreeze.preF(msg);

                var uq = await preUq;
                emit("futuresPreData", await prefq);

                var preDq = iBreeze.preD(msg, uq[uq.length - 1]);
                var pq = await preDq[0]; var cq = await preDq[1];
                emit("qdeltastrikes", uq, pq, cq);
                break;
            
            case 'startstream':
                sn.ini(msg);
                sn.inqsub();
                break;
            case 'speed':
                /*if (p === 10 || p === 12) {
                    sn.cg.speed = 2;
                    sn.cg.interval = 990/p*2;
                } else {
                    sn.cg.speed = 1;
                    sn.cg.interval = 990/p;
                }
                stServer.startStreamer(sn); */

                sn.changeSpeed(msg);
                break;
            case 'stop':
                sn.unsubsQuotes();
                console.log("Streaming stopped " + msg);
                break;
        
            case 'disconnect':
                console.log("socket disconnected " + s.id + ": " + msg);
                break;
            case 'exit':
                console.log("User  left " + msg);
                Session.destroy(msg);
                break;
            case 'ocnxt':
                sn.st[4].toStream = a === 'start' ? true : false;
                break
            case 'order':
                console.log("order: " + Date.now());
                var status = await sn.order(msg);
                status.counter = msg.counter;
                status.rtime = msg.time;
                emit("orderconf", status);
                break;
            case 'ws':
                ordersocket.wsconnect(msg);
                break;
            default:
                console.log("Unknown event " + event);
        }
    } catch (error) {
        console.log('Error ' + error);
    }
}

function emit(event, args)
{
    if(socket === undefined)
        connect();
    socket.emit(event, args);
}