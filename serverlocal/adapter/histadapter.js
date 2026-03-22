var BreezeConnect = require('breezeconnect').BreezeConnect;
require('console-stamp')(console, '[HH:MM:ss.l]');

var appKey = "72r5N3K05754+43ek796960QT96Hc8e1";
var appSecret = "7J965L0KM*36n1eH84690YMI4UNP645)";
var sessionId = "55070586";

var connected = false;
var breeze;
var subslist;

function connect() {

    breeze = new BreezeConnect({ "appKey": appKey });

    breeze.generateSession(appSecret, sessionId)
    .then((resp) => {
        connected = true;
        console.log("Session created");
    }).catch((err) => {
        console.log(err);
    });

    subslist = new Array(0);
}



function subscribe_ltp(symbol) {
    requests.forEach((request) => {
        subslist.set(request.instrument.symbol, {
            instrument: request.instrument,
            toStream: request.toStream,
            time: request.time,
            callback: request.callback
        });
    });

    subslist.forEach((v, k) => {
        if (v.toStream && (qStore.get(k) === undefined || qStore.get(k).quotes.length === 0)) {
            qStore.set(k, { symbol: k, quotes: new Array(0), state: 'load requested', time: v.time });
            qw(v.instrument, v.time);
        }
    });
}

function message(q) {
    genericCallback(q);
}

/*------------------------------HISTORY SERVER------------------------------*/

const sutils = require('./serverutils');
const utils = require('../../common/utils');

const streamers = new Array(4);
const streamer1 = {speed: '1X', qsid: 0, state: 'stopped'};
const streamer2 = {speed: '2X', qsid: 0, state: 'stopped'};
const streamer3 = {speed: '3X', qsid: 0, state: 'stopped'};
const streamer4 = {speed: '5X', qsid: 0, state: 'stopped'};

streamers[0] = streamer1;
streamers[1] = streamer2;
streamers[2] = streamer3;
streamers[3] = streamer4;

const subsRequests = new Array(0);
//subsRequests[0] = {user: '0', speed: '0', instrument: undefined, time: undefined};
const usermap = new Map();
const qStore = new Map();

function startStreamerSR(speed){
    var stmr = utils.filter(streamers, {keys: [speed] })[0];
    
    if(stmr.state === 'stopped') {
        stmr.qsid = setInterval(() => {
            try {
                dothings(speed);
            } catch (err) {
                clearInterval(stmr.qsid);
                console.error(err);
            }
        }, 994 / parseInt(speed.substring(0, 1)));
        stmr.state = 'started';   
    }
}

function stopStreamerSR(speed){
    var stmr = utils.filter(streamers, {keys: [speed] })[0];
    
    if(stmr.state === 'started') {
        clearInterval(stmr.qsid);
        stmr.state = 'stopped';
    }
}

function subscribeSR(request) {
    var exReq = utils.filter(subsRequests, {keys: [request.user]})[0];
    if (exReq === undefined) {
        subsRequests.push(request);
    }
    else {
        exReq.speed = request.speed;
        exReq.instrument = request.instrument;
    }
}

function unsubsribeSR(request) {
    var exReq = utils.filter(subsRequests, {keys: [request.user]})[0];
    if (exReq !== undefined) {
        subsRequests.splice(subsRequests.indexOf(exReq), 1);
    }
}   

function dothingsSR(speed) 
{
    var reqs = utils.filter(subsRequests, {keys: [speed]});
    reqs.forEach((req) => {
        var q = q(req.instrument, req.time);
        if(q !== undefined)
            message(req.uid, q);
    });
}

function q(instrument, time)
{
    var idx = -1;
    var qStore = usermap.get(uid).qs;
    var quotes = qStore.get(instrument.symbol).quotes;
    
    if (quotes != undefined)
        idx = sutils.findQuoteByTime(quotes, time);

    if ((quotes === undefined || idx === -2 || quotes.length - idx < 25) && qStore.state != 'load requested')
        qw(instrument, time);

    return idx > -1 ? st.quotes[idx] : undefined;
}

async function getHistoricalData(instrument, sTime, endTime, interval) {
    
    var b = { exchangeCode: instrument.exchange };
    b.interval = interval != undefined ? interval : '1second';
    b.stockCode = instrument.stockCode;
    b.productType = instrument.type;
    b.strikePrice = instrument.strike;
    b.right = instrument.right;
    b.expiryDate = instrument.exchange != 'NSE' ? formatExpiry(instrument.expiry) : undefined;
    b.fromDate = ISODate(sTime);
    b.toDate = ISODate(endTime);
    //b.toDate = ISODate(sTime + ((16 * 60) + (60 - new Date(lt).getSeconds())) * 1000);

    utils.printObject(b);
    try {
        var resp = await breeze.getHistoricalDatav2(b);

        if (resp.Status === 200)
            return { status: resp.status, quotes: resp.Success, state: 'ready to stream', lastLoadTime: sTime };
        else
            throw Error(resp.Error);
    } catch (error) {
        console.error("Error from breeze call " + error + '\n' + error.stack);
        return { status: 0, quotes: error, state: 'error', lastLoadTime: sTime };
    }
}


function qw(instrument, time) {
    var qs = getHistoricalData(instrument, time);

    return aq(instrument, qs);
}

function aq(instrument, qs) {
    return qs.then((q) => {
        if (q.status === 200) {
            var sItem = qStore.get(instrument.symbol)
            sItem.quotes = q;
        }
    });
}

function ISODate(datetime) {
    return (new Date(datetime + 330 * 60 * 1000)).toISOString();
}

function formatExpiry(expiry) {
    var e = expiry.slice(0, 2).concat('-').concat(expiry.slice(2, 5)).concat('-20').concat(expiry.slice(5));

    return (new Date((e).concat(', 21:00'))).toISOString(); // add 5.30 to 15:30 to get 21:00 UTC
}

module.exports = {
    connect,
    startStreamer,
    getHistoricalData
};