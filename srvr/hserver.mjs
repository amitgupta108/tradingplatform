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
        {key: '10x', speed: 10, qsid: 0, state: 'stopped'},

    ];  

function connect() {
    return sutils.connect(wsmessage);

}

function clientInit(appid, simStartTime, speed = '1x') {
    subsRequests.set(appid, new Array(0));
    if(client_clocks.get(appid) === undefined) {
        client_store.set(appid, new Array(0));
        client_clocks.set(appid, {appid: appid, sTime: simStartTime, currentTime: simStartTime, key: speed, lastaction: 'none'});
    }
}

function startStreamer(stmrkey){
    const stmr = streamers.find((s) => s.key === stmrkey);
    
    if(stmr.state === 'stopped') 
    {
        stmr.qsid = setInterval(() => {
        
            dothings(stmrkey);
            runclient_clocks(stmrkey);
            if(Array.from(client_clocks.values()).filter(c => c.key === stmrkey).length === 0) 
                stopStreamer(stmrkey);
        }, 980 / stmr.speed);
        stmr.state = 'started';   
    }
}

function stopStreamer(stmrkey){
    var stmr = streamers.find((x) => x.key === stmrkey);
    
    if(stmr?.state != 'stopped') {
        clearInterval(stmr.qsid);
        stmr.state = 'stopped';
        stmr.qsid = 0;
    }
}

function dothings(stmrkey) 
{
    try
    {
        for (const c of client_clocks.values()) {
            if (c.key === stmrkey && c.lastaction !== 'pause') {
                var reqs = subsRequests.get(c.appid)?.filter((s) => s.instrument.model === 'history') || [];
                reqs.forEach((req) => {
                    q(req.appid, req.instrument, c.currentTime);
                });
            }
        }
    } catch (error){
        console.log('Error for appid, unsubscribe all: ' + error.appid + ' ' + error.stack);
        subsRequests.delete(error.appid);
    }
}

function runclient_clocks(stmrkey) 
{
    for (const c of client_clocks.values()) {
        if (c.key === stmrkey) {
            if(c.state === 'start initiated')
                c.state = 'started';

            if(!(c.state === 'paused' || c.state === 'stopped'))
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

function start_sim(appid, requests) {

    if(requests?.length > 0)
    {
        subscribe(appid, requests);
        const c = client_clocks.get(appid);
        c.lastaction = 'start';
        startStreamer(c.key);
        c.state = 'start initiated';

        return { status: 'success' };
    }
}

function subscribe(appid, requests) {
    
    const exReqs = subsRequests.get(appid);
    const qArray = client_store.get(appid);
    const c = client_clocks.get(appid);

    requests.forEach((request) => {
        const idx = exReqs.findIndex((s) => s.symbol === request.symbol
            && s.instrument.model === request.instrument.model);
        
        if(idx === -1)
            exReqs.push(request);
            
        let st = qArray.find((q) => q.symbol === request.symbol);
        if(st === undefined) {
            st = {appid: appid, symbol: request.instrument.symbol, quotes: undefined, indexA: undefined,
                 trimIndex: -1, state: 'initialized', lastUpdated: c.currentTime}
            qArray.push(st);
            
            st.state = 'load requested';  
            qw(st, request.instrument, c.currentTime);
        }
    });
}

function pause(appid, action) {
    const c = client_clocks.get(appid);
    c.lastaction = action;
    c.state = action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'unknown';
    return c.state;
}

function unsubscribe(appid, requests) {
    const i_reqs = subsRequests.get(appid);
    requests.forEach((request) => {
        
        var idx = i_reqs.findIndex((s) => s.symbol === request.symbol
            && request.instrument.model === s.instrument.model);
    
        if(idx !== -1)
            i_reqs.splice(idx, 1);
    });
}

function clear(appid)
{
    client_clocks.delete(appid);
    client_store.delete(appid);
    subsRequests.delete(appid);
    
    console.log('Drop user ' + appid);
    return {status: 'success'};
}

function q(appid, instrument, time)
{
    var qArray = client_store.get(appid);
    var st = qArray.find((q) => q.symbol === instrument.symbol);

    var idx = -1;
    if (st?.quotes !== undefined && st.trimIndex > 0)
    {
        if(st.quotes[st.trimIndex].ltt === time)
            idx = st.trimIndex++;
    }
    else if(st?.quotes !== undefined && idx < 0)
    {
        idx = st.indexA.indexOf(time);
        if(idx >= 0)
            st.trimIndex = idx + 1;
    }
    else if(st === undefined) {
        st = {appid: appid, symbol: instrument.symbol, quotes: undefined, indexA: undefined, trimIndex: -1, state: 'initialized', lastUpdated: time};
        qArray.push(st);
    }

    if(idx >= 0)
        futsocket.emit('quote', st.quotes[idx], 'history', appid);

    if ((st.quotes === undefined || st.quotes.length - idx < 40) && st.state != 'load requested')
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
        st.state = 'load failed';
        console.log('Rejection for appid: ' + st.appid + ' ' + reason);
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
    return { status: 'success' };

}

function live_sub(list, action)
{
    sutils.wssub(list, action)
    .then((responses) => { 
        console.log('sub successful, count: ' + responses.length);
    })
    .catch((error) => {
        console.log('one or more subs failed');
    });
}

function subscribe_vix(appid, mode, action)
{
    var b = {exchangeCode: 'NSE', stockCode: 'INDVIX', symbol: 'INDVIX', model: mode.toLowerCase(), interval: '1second'};

    if(mode.startsWith('HISTORY')) {
        const vix_request = subsRequests.get(appid)?.find((r) => 
            r.symbol === appid 
            && r.model === 'history');

            if(vix_request === undefined && action === 'subs')
                subsRequests.get(appid)?.push({ appid: appid,
                    symbol: b.stockCode,
                    instrument: b});
    }
    else     
        sutils.subscribe(b, action)
        .then((resp) => console.log(resp))
        .catch((error) => console.log(resp));
}

function wsmessage(q)
{
    futsocket.emit('quote', q, 'live', undefined);
}

export default {
    clientInit,
    subscribe,
    unsubscribe,
    changeSpeed,
    clear,
    getHistory,
    addListener,
    connect,
    subscribe_vix,
    start_sim,
    live_sub,
    pause
};