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

function clientInit(appid, simStartTime, speed = '1x') {
    if(client_clocks.get(appid) === undefined) {
        client_store.set(appid, new Array(0));
        client_clocks.set(appid, {appid: appid, sTime: simStartTime, currentTime: simStartTime, key: speed});
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
            var reqs = subsRequests.filter((s) => s.appid === c.appid && s.instrument.model === 'history');
            reqs.forEach((req) => {
                count++;
                var qt = q(req.appid, req.instrument, c.currentTime);
                if(qt !== undefined) {
                    futsocket.emit('quote', qt, 'history', req.appid);
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

function changeSpeed(appid, stmrkey){
    var clock = client_clocks.get(appid);
    clock.key = stmrkey;
    
    var stmr = streamers.find((s) => s.key === stmrkey);
    var exReq = utils.filter(subsRequests, {appid: [appid]});
    if(stmr.state === 'stopped' && exReq.length > 0)
        startStreamer(stmrkey);
}

function subscribe(requests) {
    
    requests.forEach((request) => {
        var exReqs = subsRequests.filter((s) => 
            s.appid === request.appid 
            && s.symbol === request.symbol
            && s.instrument.model === request.instrument.model);
        
        if(exReqs.length === 0)
            subsRequests.push(request);            
    });

    const live_ones = requests.filter((r) => r.instrument.model === 'live');
    live_sub(live_ones, 'subs');

    if(requests.length > 0 && requests.length > live_ones.length) {
        var stmrkey = client_clocks.get(requests[0].appid).key;
        var streamer = streamers.find((s) => s.key === stmrkey);
        if(streamer.state !== 'started')
            startStreamer(stmrkey);
    }
}

function unsubscribe(requests) {
    requests.forEach((request) => {
        
        var exReqs = utils.filter(subsRequests, {appid: [request.appid], symbol: [request.symbol]});   
        if (exReqs.length > 0) {
            exReqs.forEach((r) => {
                subsRequests.splice(subsRequests.indexOf(r), 1);
            });
        }
    });
}   

function unsubscribeall(appid)
{
    var others = subsRequests.filter((s) => s.appid !== appid);   
    subsRequests = others;
}   

function exit(appid)
{
    console.log('Drop user ' + appid);
    client_clocks.delete(appid);
    client_store.delete(appid);
    unsubscribeall(appid);
}

function q(appid, instrument, time)
{
    var qArray = client_store.get(appid);
    var st = qArray.find((q) => q.symbol === instrument.symbol);
    if(st === undefined) {
        st = {appid: appid, symbol: instrument.symbol, quotes: undefined, state: 'initialized', lastUpdated: time};
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
    const clock = client_clocks.get(p.appid);
    if(clock !== undefined)
        endTime = clock.currentTime;
    
    return sutils.getHistory(p, startTime, endTime, interval);
}

function addListener(eventName, callback){
    futsocket.addListener(eventName, callback);
}

function live_sub(list, action)
{
    try {
        if(action === 'subs')
            sutils.wssub(list, wsmessage);
        else
            sutils.wsunsub(list);
    } catch (error) {
        console.log(error);
    }
}

function wsmessage(q)
{
    futsocket.emit('quote', q, 'live', undefined);
}

export default {
    clientInit,
    subscribe,
    unsubscribe,
    unsubscribeall,
    changeSpeed,
    exit,
    getHistory,
    addListener,
};