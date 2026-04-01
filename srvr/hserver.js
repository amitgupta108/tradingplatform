
const sutils = require('./serverutils');
const utils = require('../common/utils');
const qserver = require('../serverlocal/quotes');

var BreezeConnect = require('breezeconnect').BreezeConnect;
require('console-stamp')(console, '[HH:MM:ss.l]');

var appKey = "72r5N3K05754+43ek796960QT96Hc8e1";
var appSecret = "70F8#U89u0v7079r510^9H87L%o592z9";
var sessionId = "55165038";

var breeze = new BreezeConnect({ "appKey": appKey });

breeze.generateSession(appSecret, sessionId)
.then((resp) => {
    console.log("Session created");
}).catch((err) => {
    console.log(err);
});;

var userclocks = new Map();
const subsRequests = new Array(0);
//subsRequests[0] = {user: '0', speed: '1', instruments: undefined, time: undefined};
const userqcollmap = new Map();

const streamers = [
        {key: '1x', speed: 1, qsid: 0, state: 'stopped', time: 0},
        {key: '2x', speed: 2, qsid: 0, state: 'stopped', time: 0},
        {key: '3x', speed: 3, qsid: 0, state: 'stopped', time: 0},  
        {key: '5x', speed: 5, qsid: 0, state: 'stopped', time: 0},
    ];

function connect(uid, simStartTime) {
    userqcollmap.set(uid, new Array(0));
    userclocks.set(uid, {sTime: simStartTime, cTime: Date.now()});
}

function startStreamer(speed){
    var stmr = utils.filter(streamers, {keys: [speed] })[0];
    
    if(stmr.state === 'stopped') {
        stmr.qsid = setInterval(() => {
            try {
                var resp = dothings(speed);
                stmr.time = stmr.time + 1000;
                if(resp.count === 0) 
                    stopStreamer(resp.speed);
            } catch (err) {
                clearInterval(stmr.qsid);
                console.error(err);
            }
        }, 995 / stmr.speed);
        stmr.state = 'started';   
    }
}

function stopStreamer(speed){
    var stmr = utils.filter(streamers, {keys: [speed] })[0];
    
    if(stmr.state === 'started') {
        clearInterval(stmr.qsid);
        stmr.state = 'stopped';
        stmr.qsid = 0;
    }
}

function subscribe(requests) {
    
    requests.forEach((request) => {
        
        if(request.uid === undefined || request.instrument === undefined) {
            console.error("Invalid subscription request " + JSON.stringify(request));
            return;
        }
        var exReq = utils.filter(subsRequests, {uid: [request.uid], symbol: [request.symbol]})[0];
        if (exReq === undefined) {
            subsRequests.push(request);
        }
    });

    if(streamers[0].state === 'stopped')
        startStreamer('1x');
}

function unsubscribe(requests) {
    requests.forEach((request) => {
        
        if(request.uid === undefined) {
            console.error("Invalid unsubscription request " + JSON.stringify(request));
            return;
        }
        var symbol = request.instrument != undefined ? request.instrument.symbol : undefined;
        var exReq = utils.filter(subsRequests, {uid: [request.uid], symbol: [symbol]})[0];   
        if (exReq !== undefined) {
            subsRequests.splice(subsRequests.indexOf(exReq), 1);
        }
    });
}   

function dothings(speed) 
{
    var count = 0;
    //var reqs = utils.filter(subsRequests, {keys: [speed]});
    subsRequests.forEach((req) => {
        count++;
        var qt = q(userqcollmap.get(req.uid), req.instrument, getUserTime(req.uid));

        if(qt !== undefined)
            qserver.emitQuotes(req.uid, qt, 'history');
    });
    return {speed: speed, count: count};
}

function getUserTime(uid) 
{
    var uTime = userclocks.get(uid);
    if (uTime !== undefined) {
        var cTime = Date.now();
        var sTime = uTime.sTime;
        var timeElapsed = Math.round((cTime - uTime.cTime) / 1000) * 1000;
        return sTime + timeElapsed;
    }
    return undefined;
}

function q(qArray, instrument, time)
{
    var st = utils.filter(qArray, {symbol: [instrument.symbol]})[0];
    if(st === undefined)
        st = {symbol: instrument.symbol, quotes: undefined, state: 'initialized', lastLoadTime: 0};
    var quotes = st.quotes;

    var idx = -1;
    if (quotes != undefined)
        idx = sutils.findQuoteByTime(quotes, time);

    if ((quotes === undefined || idx === -2 || quotes.length - idx < 25) && st.state != 'load requested')
    {
        st.state = 'load requested';
        qw(qArray, instrument, time);
    }

    return idx > -1 ? quotes[idx] : undefined;
}

function qw(qArray, instrument, time) {
    var qs = getHistoricalData(instrument, time);

    return qs.then((resp) => {
        var st = utils.filter(qArray, {symbol: [resp.symbol]})[0];
    
        if(st === undefined) 
            qArray.push({symbol: resp.symbol, quotes: resp.quotes, state: resp.state});
        else {
            st.quotes = resp.quotes;
            st.state = resp.state;
        }
        return resp;   
    });
}

async function getHistoricalData(instrument, sTime, endTime, interval) 
{
    var b = { exchangeCode: instrument.exchange };
    b.interval = interval != undefined ? interval : '1second';
    b.stockCode = instrument.stockCode;
    b.strikePrice = instrument.strike;
    b.right = instrument.right;
    b.productType = instrument.right != undefined ? 'options' : 'futures';
    b.expiryDate = instrument.exchange != 'NSE' ? sutils.formatExpiry(instrument.expiry) : undefined;
    b.fromDate = sutils.ISODate(sTime);
    b.toDate = endTime != undefined ? sutils.ISODate(endTime) : sutils.ISODate(sTime + ((16 * 60) * 1000));  

    utils.printObject(b);
    try {
        var resp = await breeze.getHistoricalDatav2(b);

        if (resp.Status === 200)
            return { status: resp.Status, symbol: instrument.symbol, quotes: resp.Success, state: 'ready to stream', lastLoadTime: sTime };
        else
            throw Error(resp.Error);
    } catch (error) {
        console.error("Error from breeze call " + error + '\n' + error.stack);
        return { status: 0, symbol: instrument.symbol, quotes: undefined, state: 'load failed', lastLoadTime: sTime };
    }
}

module.exports = {
    connect,
    getHistoricalData,
    subscribe,
    unsubscribe,
};