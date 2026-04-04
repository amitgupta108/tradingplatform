const sutils = require('./serverutils');
const utils = require('../common/utils');
const qserver = require('../serverlocal/quotes');

var BreezeConnect = require('breezeconnect').BreezeConnect;
require('console-stamp')(console, '[HH:MM:ss.l]');

var appKey = "72r5N3K05754+43ek796960QT96Hc8e1";
var appSecret = "70F8#U89u0v7079r510^9H87L%o592z9";
var sessionId = "55195931";

var breeze = new BreezeConnect({ "appKey": appKey });

breeze.generateSession(appSecret, sessionId)
.then((resp) => {
    console.log("Session created");
}).catch((err) => {
    console.log(err);
});

const userclocks = new Map();
const subsRequests = new Array(0);
const userqcollmap = new Map();

const streamers = [
        {key: '1x', speed: 1, qsid: 0, state: 'stopped'},
        {key: '2x', speed: 2, qsid: 0, state: 'stopped'},
        {key: '3x', speed: 3, qsid: 0, state: 'stopped'},  
        {key: '5x', speed: 5, qsid: 0, state: 'stopped'},
    ];  

function connect(uid, simStartTime) {
    userqcollmap.set(uid, new Array(0));
    userclocks.set(uid, {uid: uid, sTime: simStartTime, key: '1x'});
}

function startStreamer(stmrkey){
    const stmr = utils.filter(streamers, {keys: [stmrkey] })[0];
    
    if(stmr.state === 'stopped') 
    {
        try {
            stmr.qsid = setInterval(() => {
            
                var resp = dothings(stmrkey);
                runUserClocks(stmrkey);
                if(resp.count === 0) 
                    stopStreamer(resp.key);
            }, 900 / stmr.speed);
        } catch (err) {
            clearInterval(stmr.qsid);
            stmr.state = 'stopped';   
            console.error(err);
        }
        stmr.state = 'started';   
    }
}

function stopStreamer(stmrkey){
    var stmr = streamers.find((x) => x.key === stmrkey);
    
    if(stmr.state != 'stopped') {
        clearInterval(stmr.qsid);
        stmr.state = 'stopped';
        stmr.qsid = 0;
    }
}

function dothings(stmrkey) 
{
    var count = 0;
    var usrSpdComb = utils.filter(userclocks.values().toArray(), {keys: [stmrkey]});
    usrSpdComb.forEach((c) => {
        var reqs = utils.filter(subsRequests, {uid: c.uid});
        reqs.forEach((req) => {
            count++;
            var qt = q(req.uid, req.instrument, c.sTime);

            if(qt !== undefined)
                qserver.emitQuotes(req.uid, qt, 'history');
        });
    });
    return {key: stmrkey, count: count};
}

function runUserClocks(stmrkey) 
{
    var usrSpdComb = utils.filter(userclocks.values().toArray(), {key: [stmrkey]});
    usrSpdComb.forEach((c) => {
        c.sTime = c.sTime + 1000;
    });
}

function changeSpeed(uid, stmrkey){
    var clock = userclocks.get(uid);
    clock.key = stmrkey;
    
    var stmr = streamers.find((s) => s.key === stmrkey);
    var exReq = utils.filter(subsRequests, {uid: [uid]});
    if(stmr.state === 'stopped' && exReq.length > 0)
        startStreamer(stmrkey);
}

function subscribe(requests, stmrkey = undefined) {
    
    if(stmrkey !== undefined && requests.length > 0) {
        userclocks.get(requests[0].uid).key = stmrkey;
        var streamer = streamers.find((s) => s.key === stmrkey);
        if(streamer.state !== 'stated')
            startStreamer(stmrkey);
    }

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

function disconnect(uid)
{
    console.log('Drop user ' + uid);
    userclocks.delete(uid);
    userqcollmap.delete(uid);
    var exReq = utils.filter(subsRequests, {uid: [uid]});   
    exReq.forEach((r) => {
        subsRequests.splice(subsRequests.indexOf(r), 1);
    });
}

function q(uid, instrument, time)
{
    var qArray = userqcollmap.get(uid);
    var st = qArray.find((q) => q.symbol === instrument.symbol);
    if(st === undefined) {
        st = {uid: uid, symbol: instrument.symbol, quotes: undefined, state: 'initialized', lastUpdated: time};
        qArray.push(st);
    }

    var idx = -1;
    if (st.quotes != undefined)
        idx = sutils.findQuoteByTime(st.quotes, time);

    if ((st.quotes === undefined || idx === -2 || st.quotes.length - idx < 25) && st.state != 'load requested')
    {
        st.state = 'load requested';
        qw(st, instrument, time);
    }

    return idx > -1 ? st.quotes[idx] : undefined;
}

function qw(st, instrument, time) {
    var qs = getHistoricalData(st, instrument, time);

    return qs.then((resp) => {
        return resp;   
    });
}

async function getHistoricalData(st, instrument, sTime, endTime, interval) 
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

        if (resp.Status === 200 && resp.Success.length > 0) {
            st.quotes = resp.Success;
            st.state = 'ready to stream';
            st.lastUpdated = sTime;
            return st;
         }
        else
            throw Error(resp.Error);
    } catch (error) {
        console.error("Error from breeze call " + error + '\n' + error.stack);
        st.state = 'load failed';
        st.lastUpdated = sTime;
        return st;
    }
}

module.exports = {
    connect,
    getHistoricalData,
    subscribe,
    unsubscribe,
    changeSpeed,
    disconnect
};