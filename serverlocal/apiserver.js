var https  = require('https');
var express = require('express');
var session = require('express-session');
const fs = require('fs');
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
app.use(express.static('web'));
app.use(express.json());
app.use(es);

const options = {
    key: fs.readFileSync('/Users/amitgupta/algoplatform/server.key'),
    cert: fs.readFileSync('/Users/amitgupta/algoplatform/server.cert'),
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
    setuser(uid, s);
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
    
    sn.s.on('restored', (response) => {
        if(response.continue === true)
            sn.inqsub();
    });

    sn.s.on('preData', async (p) => {
        console.log("Pre data request " + new Date(p.startTime));

        var preUq = iBreeze.preU(p);
        var prefq = iBreeze.preF(p);
        
        var uq = await preUq;
        sn.s.emit("futuresPreData", await prefq);
        
        var preDq = iBreeze.preD(p, uq[uq.length - 1]);
        var pq = await preDq[0]; var cq = await preDq[1]; 
        sn.s.emit("qdeltastrikes", uq, pq, cq);
    });

    sn.s.on('startstream', (p) => {       
        sn.ini(p);
        sn.inqsub();
    });

    sn.s.on('speed', (p) => {
        /*if (p === 10 || p === 12) {
            sn.cg.speed = 2;
            sn.cg.interval = 990/p*2;
        } else {
            sn.cg.speed = 1;
            sn.cg.interval = 990/p;
        }
        stServer.startStreamer(sn); */

        sn.changeSpeed(p);
    });

    sn.s.on('stop', (reason) => {
        sn.unsubsQuotes();
        console.log("Streaming stopped " + reason);    
    });

    sn.s.on('disconnect', (reason) => {
        console.log("socket disconnected " + sn.s.id + ": " + reason); 
    });

    sn.s.on('exit', (uid) => {
        console.log("User  left " + uid);
        Session.destroy(uid);
    });

    sn.s.on('ocnxt', (a) => {
        sn.st[4].toStream = a === 'start' ?  true : false;
    });
    
    sn.s.on('order', async (p) => {
        console.log("order: " + Date.now());
        var status = await sn.order(p);
        status.counter = p.counter;
        status.rtime = p.time;
        sn.s.emit("orderconf", status);
    });

    sn.s.on('ws', async (p) => {
        ordersocket.wsconnect(p);
    });
}