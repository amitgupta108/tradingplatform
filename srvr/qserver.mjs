import sutils from './breezeclient.mjs';

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
    return sutils.connect(emit);
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
                var reqs = subsRequests.get(c.appid) || [];
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

function start_sim(appid, requests) {

    if(requests?.length > 0)
    {
        subscribe(appid, requests);
        const c = client_clocks.get(appid);
        c.lastaction = 'start';
        startStreamer(c.key);
        c.state = 'start initiated';
    }
}

function subscribe(appid, requests) {
    
    const exReqs = subsRequests.get(appid);

    requests.forEach((request) => {
        const idx = exReqs.findIndex((s) => s.symbol === request.symbol);
        
        if(idx === -1)
            exReqs.push(request);
            
        addToClientStore(appid, request.instrument);
    });
}

function addToClientStore(appid, instrument)
{
    const qArray = client_store.get(appid);
    const c = client_clocks.get(appid);

    let st = qArray.find((q) => q.symbol === instrument.symbol);
    if (st === undefined) {
        let st = {
            appid: appid, symbol: instrument.symbol, quotes: undefined, indexA: undefined,
            trimIndex: -1, state: 'initialized', lastUpdated: c.currentTime};

        qArray.push(st);

        st.state = 'load requested';
        qw(st, instrument, c.currentTime);
    }
}

function unsubscribe(appid, requests) {
    const i_reqs = subsRequests.get(appid);
    requests.forEach((request) => {
        
        var idx = i_reqs.findIndex((s) => s.symbol === request.symbol);
    
        if(idx !== -1)
            i_reqs.splice(idx, 1);
    });
}

function q(appid, instrument, time)
{
    var qArray = client_store.get(appid);
    var st = qArray.find((q) => q.symbol === instrument.symbol);

    if (st?.quotes !== undefined) {
        var idx = -1;
        if (idx < 0) {
            idx = st.indexA.indexOf(time);
            if (idx >= 0)
                st.trimIndex = idx + 1;
        }
        else if (st.trimIndex > 0 && st.quotes[st.trimIndex].ltt === time) {
            idx = st.trimIndex++;
        }

        if (idx >= 0)
            emit(st.quotes[idx], 'hist', appid);
    }
    
    if ((st.quotes === undefined || st.quotes.length - idx < 50) && st.state != 'load requested')
    {
        setImmediate(() => {
            st.state = 'load requested';
            qw(st, instrument, time);
        });
    }
}

function qw(st, instrument, time) {
    var qs = sutils.getHistoricalData(st, instrument, time);

    qs.catch((reason) => {
        st.state = 'load failed';
        console.log('Rejection for appid: ' + st.appid + ' ' + reason);
    });
}

function clear(appid) {
    client_clocks.delete(appid);
    client_store.delete(appid);
    subsRequests.delete(appid);

    console.log('Drop user ' + appid);
    return { status: 'success' };
}

function changeSpeed(appid, stmrkey) {
    var clock = client_clocks.get(appid);
    clock.key = stmrkey;

    var stmr = streamers.find((s) => s.key === stmrkey);
    var exReq = subsRequests.get(appid) || [];
    if (stmr.state === 'stopped' && exReq.length > 0)
        startStreamer(stmrkey);
}

function pause(appid, action) {
    const c = client_clocks.get(appid);
    c.lastaction = action;
    c.state = action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'unknown';
    return c.state;
}

function getHistory(p)
{
    const clock = client_clocks.get(p.appid);
    const endTime = clock !== undefined ? clock.currentTime : p.endTime;

    return sutils.getHistory(p, p.startTime, endTime, p.interval);
}

function addListener(eventName, callback)
{
    const list = futsocket.listeners(eventName);
    if(list.length === 0)
        futsocket.addListener(eventName, callback);
    
    console.log('listener count on qserver ' + eventName + ' ' + futsocket.listeners(eventName).length);
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
    var instrument = {exchange: 'NSE', key: 'vix', stockCode: 'INDVIX', symbol: 'INDVIX', interval: '1second'};

    const request = {
        appid: appid,
        symbol: instrument.stockCode,
        instrument: instrument
    };
    
    if(mode.startsWith('HISTORY')) {
        if(action === 'subs')
            subscribe([request], 'subs');
        else
            unsubscribe([request], 'unsub');
    }
    else     
        sutils.wssub([request], action)
        .then((resp) => console.log(resp))
        .catch((error) => console.log(error));
}

export function emit(q, eventName, appid)
{
    const mode = eventName ?? 'live';

    if(q.stock_code === 'INDVIX')
        futsocket.emit(mode + '-vix', q, appid);    
    else 
        futsocket.emit(mode + '-quote', q, appid);
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