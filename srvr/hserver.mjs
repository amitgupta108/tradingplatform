import sutils from './serverutils.mjs';
import utils from '../common/utils.mjs';

import EventEmitter  from 'node:events';
const futsocket = new EventEmitter();

const client_clocks = new Map();
const client_store = new Map();
var subsRequests = new Array(0);


const streamers = [
        {key: '1x', speed: 1, qsid: 0, state: 'stopped'},
        {key: '2x', speed: 2, qsid: 0, state: 'stopped'},
        {key: '3x', speed: 3, qsid: 0, state: 'stopped'},  
        {key: '5x', speed: 5, qsid: 0, state: 'stopped'},
    ];  

function clientInit(uid, simStartTime, speed = '1x') {
    if(client_clocks.get(uid) === undefined) {
        client_store.set(uid, new Array(0));
        client_clocks.set(uid, {uid: uid, sTime: simStartTime, currentTime: simStartTime, key: speed});
    }
}

function startStreamer(stmrkey){
    const stmr = utils.filter(streamers, {keys: [stmrkey] })[0];
    
    if(stmr.state === 'stopped') 
    {
        try {
            stmr.qsid = setInterval(() => {
            
                var resp = dothings(stmrkey);
                runclient_clocks(stmrkey);
                if(resp.count === 0) 
                    stopStreamer(resp.key);
            }, 980 / stmr.speed);
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
    try
    {
        var count = 0;
        var usrSpdComb = utils.filter(client_clocks.values().toArray(), {keys: [stmrkey]});
        usrSpdComb.forEach((c) => {
            var reqs = utils.filter(subsRequests, {uid: c.uid});
            reqs.forEach((req) => {
                count++;
                var qt = q(req.uid, req.instrument, c.currentTime);
                if(qt !== undefined) {
                    qt.symbol = req.instrument.symbol;
                    qt.key = req.instrument.key;
                    futsocket.emit(qt.key, qt, req.uid, 'icicihistory');
                }
            });
        });
    } catch (exception){
        console.log(exception);
    }
    return {key: stmrkey, count: count};
}

function runclient_clocks(stmrkey) 
{
    var usrSpdComb = utils.filter(client_clocks.values().toArray(), {key: [stmrkey]});
    usrSpdComb.forEach((c) => {
        c.currentTime = c.currentTime + 1000;
    });
}

function changeSpeed(uid, stmrkey){
    var clock = client_clocks.get(uid);
    clock.key = stmrkey;
    
    var stmr = streamers.find((s) => s.key === stmrkey);
    var exReq = utils.filter(subsRequests, {uid: [uid]});
    if(stmr.state === 'stopped' && exReq.length > 0)
        startStreamer(stmrkey);
}

function subscribe(requests) {
    
    requests.forEach((request) => {
        var exReqs = utils.filter(subsRequests, {uid: [request.uid], symbol: [request.symbol]});
        if(exReqs.length === 0)
            subsRequests.push(request);
    });

    if(requests.length > 0) {
        var stmrkey = client_clocks.get(requests[0].uid).key;
        var streamer = streamers.find((s) => s.key === stmrkey);
        if(streamer.state !== 'stated')
            startStreamer(stmrkey);
    }
}

function unsubscribe(requests) {
    requests.forEach((request) => {
        
        var exReqs = utils.filter(subsRequests, {uid: [request.uid], symbol: [request.symbol]});   
        if (exReqs.length > 0) {
            exReqs.forEach((r) => {
                subsRequests.splice(subsRequests.indexOf(r), 1);
            });
        }
    });
}   

function unsubscribeall(uid)
{
    var others = subsRequests.filter((s) => s.uid !== uid);   
    subsRequests = others;
}   

function exit(uid)
{
    console.log('Drop user ' + uid);
    client_clocks.delete(uid);
    client_store.delete(uid);
    unsubscribeall(uid);
}

function q(uid, instrument, time)
{
    var qArray = client_store.get(uid);
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
    var qs = sutils.getHistoricalData(st, instrument, time);

    return qs.then((resp) => {
        return resp;   
    }).catch((reason) => {
        console.log('Error from historical data load ' + reason);
    });
}

function getHistory(p, startTime, endTime, interval)
{
    const clock = client_clocks.get(p.uid);
    if(clock !== undefined)
        endTime = clock.currentTime;
    
    return sutils.getHistory(p, startTime, endTime, interval);
}

function addListener(eventName, callback){
    futsocket.addListener(eventName, callback);
}

function wsLive(uid, list, action)
{
    try {
        if(action === 'subs')
            sutils.wssub(list, (q) => {
                wsmessage(uid, q);
            });
        else
            sutils.wsunsub(list);
    } catch (error) {
        console.log(error);
    }
}

function wsmessage(uid, q)
{
    q.symbol = 'INDVIX';
    q.key = 'vix';
    futsocket.emit(q.key, q, uid, 'icicilive');
}

export default {
    clientInit,
    subscribe,
    unsubscribe,
    unsubscribeall,
    changeSpeed,
    exit,
    getHistory,
    wsLive,
    addListener,
};