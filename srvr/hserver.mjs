import sutils from './serverutils.mjs';

import EventEmitter  from 'node:events';
const futsocket = new EventEmitter();

const client_clocks = new Map();
const client_store = new Map();
const subsRequests = new Map();

const streamers = [
        {key: '1x', speed: 1, qsid: 0, state: 'stopped'},
        {key: '2x', speed: 2, qsid: 0, state: 'stopped'},
        {key: '3x', speed: 3, qsid: 0, state: 'stopped'},  
        {key: '5x', speed: 5, qsid: 0, state: 'stopped'},
    ];  

function connect(sessionId, with_socket) {
    sutils.connect(sessionId, with_socket, wsmessage);
}

function clientInit(appid, simStartTime, speed = '1x') {
    subsRequests.set(appid, new Array(0));
    if(client_clocks.get(appid) === undefined) {
        client_store.set(appid, new Array(0));
        client_clocks.set(appid, {appid: appid, sTime: simStartTime, currentTime: simStartTime, key: speed});
    }
}

function startStreamer(stmrkey){
    const stmr = streamers.find((s) => s.key === stmrkey);
    
    if(stmr.state === 'stopped') 
    {
        stmr.qsid = setInterval(() => {
        
            var resp = dothings(stmrkey);
            runclient_clocks(stmrkey);
            if(resp.count === 0) 
                stopStreamer(resp.key);
        }, 980 / stmr.speed);
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
        for (const c of client_clocks.values()) {
            if (c.key === stmrkey) {
                var reqs = subsRequests.get(c.appid)?.filter((s) => s.instrument.model === 'history') || [];
                reqs.forEach((req) => {
                    count++;
                    q(req.appid, req.instrument, c.currentTime);
                    //var qt = q(req.appid, req.instrument, c.currentTime);
                    //if(qt !== undefined)
                    //    futsocket.emit('quote', qt, 'history', req.appid);
                });
            }
        }
    } catch (error){
        console.log('Error for appid, unsubscribe all: ' + error.appid + ' ' + error);
        subsRequests.delete(error.appid);
    }
    return {key: stmrkey, count: count};
}

function runclient_clocks(stmrkey) 
{
    for (const c of client_clocks.values()) {
        if (c.key === stmrkey) {
            c.currentTime = c.currentTime + 1000;
        }
    }
}

function changeSpeed(appid, stmrkey){
    var clock = client_clocks.get(appid);
    clock.key = stmrkey;
    
    var stmr = streamers.find((s) => s.key === stmrkey);
    var exReq = subsRequests.get(appid) || [];
    if(stmr.state === 'stopped' && exReq.length > 0)
        startStreamer(stmrkey);
}

function subscribe(requests) {
    
    requests.forEach((request) => {
        var exReqs = (subsRequests.get(request.appid))?.filter((s) => 
            s.symbol === request.symbol
            && s.instrument.model === request.instrument.model) || [];
        
        if(exReqs.length === 0)
            subsRequests.get(request.appid)?.push(request);            
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
        
        const i_reqs = subsRequests.get(request.appid);
        var exReqs = i_reqs?.filter((s) => {
            (s.symbol === request.symbol
            && request.instrument.model === s.instrument.model)
            || [];
        });
        
        if (exReqs.length > 0) {
            exReqs.forEach((r) => {
                i_reqs.splice(i_reqs.indexOf(r), 1);
            });
        }
    });
}   

function unsubscribeall(appid)
{
    subsRequests.delete(appid); 
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

    var idx = -1;
    if (st?.quotes !== undefined && st.trimIndex >= 0)
    {
        if(st.quotes[st.trimIndex].ltt === time)
            idx = st.trimIndex++;
    }
    else if(st?.quotes !== undefined && st.trimIndex < 0)
    {
        idx = st.quotes.findIndex((q) => q.ltt === time);
        if(idx >= 0)
            st.trimIndex = idx + 1;
    }
    else if(st === undefined) {
        st = {appid: appid, symbol: instrument.symbol, quotes: undefined, trimIndex: -3, state: 'initialized', lastUpdated: time};
        qArray.push(st);
    }

    if(idx >= 0)
        futsocket.emit('quote', st.quotes[idx], 'history', appid);

    if ((st.quotes === undefined || idx === -2 || st.quotes.length - idx < 25) && st.state != 'load requested')
    {
        st.state = 'load requested';
        qw(st, instrument, time);
    }
}

function qw(st, instrument, time) {
    var qs = sutils.getHistoricalData(st, instrument, time);

    return qs.then((resp) => {
        return resp;   
    }).catch((reason) => {
        console.log('Rejection for appid, unsubscribe all: ' + st.appid + ' ' + reason);
        subsRequests.delete(st.appid);
    });
}

function getHistory(p)
{
    const clock = client_clocks.get(p.appid);
    const endTime = clock !== undefined ? clock.currentTime : p.endTime;

    return sutils.getHistory(p, p.startTime, endTime, p.interval);
}

function addListener(eventName, callback)
{
    futsocket.addListener(eventName, callback);
}

function live_sub(list, action)
{
    sutils.wssub(list, action);
}

function subscribe_vix(action)
{
    sutils.subscribe_vix(action);
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
    connect,
    subscribe_vix
};