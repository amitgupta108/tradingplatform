//import breezeclient from './breezeclient.mjs';
/*
function clientInit(appid, simStartTime, speed = '1x') {
    st_q.subs_reqs.set(appid, new Array(0));
    if(st_q.clocks.get(appid) === undefined) {
        st_q.qs_store.set(appid, new Array(0));
        st_q.clocks.set(appid, {appid: appid, sTime: simStartTime, currentTime: simStartTime, key: speed, lastaction: 'none'});
    }
}

function startStreamer(stmrkey){
    const stmr = st_q.streamers.find((s) => s.key === stmrkey);
    
    if(stmr.state === 'stopped') 
    {
        stmr.qsid = setInterval(() => {
        
            dothings(stmrkey);
            runclient_clocks(stmrkey);
            if(Array.from(st_q.clocks.values()).filter(c => c.key === stmrkey).length === 0) 
                stopStreamer(stmrkey);
        }, 980 / stmr.speed);
        stmr.state = 'started';   
    }
}

function stopStreamer(stmrkey){
    var stmr = st_q.streamers.find((x) => x.key === stmrkey);
    
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
        for (const c of st_q.clocks.values()) {
            if (c.key === stmrkey && c.lastaction !== 'pause') {
                var reqs = st_q.subs_reqs.get(c.appid) || [];
                reqs.forEach((req) => {
                    q(req.appid, req.instrument, c.currentTime);
                });
            }
        }
    } catch (error){
        console.log('Error for appid, unsubscribe all: ' + error.appid + ' ' + error.stack);
        st_q.subs_reqs.delete(error.appid);
    }
}

function runclient_clocks(stmrkey) 
{
    for (const c of st_q.clocks.values()) {
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
        const c = st_q.clocks.get(appid);
        c.lastaction = 'start';
        startStreamer(c.key);
        c.state = 'start initiated';
    }
}

function subscribe(appid, requests) {
    
    const exReqs = st_q.subs_reqs.get(appid);

    requests.forEach((request) => {
        const idx = exReqs.findIndex((s) => s.symbol === request.symbol);
        
        if(idx === -1)
            exReqs.push(request);
            
        addToClientStore(appid, request.instrument);
    });
}

function addToClientStore(appid, instrument)
{
    const qArray = st_q.qs_store.get(appid);
    const c = st_q.clocks.get(appid);

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
    const i_reqs = st_q.subs_reqs.get(appid);
    requests.forEach((request) => {
        
        var idx = i_reqs.findIndex((s) => s.symbol === request.symbol);
    
        if(idx !== -1)
            i_reqs.splice(idx, 1);
    });
}

function q(appid, instrument, time)
{
    var qArray = st_q.qs_store.get(appid);
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
           emit(st.quotes[idx], appid);
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
    st_q.clocks.delete(appid);
    st_q.qs_store.delete(appid);
    st_q.subs_reqs.delete(appid);

    console.log('Drop user ' + appid);
    return { status: 'success' };
}

function changeSpeed(appid, stmrkey) {
    var clock = st_q.clocks.get(appid);
    clock.key = stmrkey;

    var stmr = st_q.streamers.find((s) => s.key === stmrkey);
    var exReq = st_q.subs_reqs.get(appid) || [];
    if (stmr.state === 'stopped' && exReq.length > 0)
        startStreamer(stmrkey);
}

function pause(appid, action) {
    const c = st_q.clocks.get(appid);
    c.lastaction = action;
    c.state = action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'unknown';
    return c.state;
}

function getHistory(appid, r)
{
    const clock = st_q.clocks.get(appid);
    const endTime = clock !== undefined ? clock.currentTime : r.endTime;

    return sutils.getHistory(r, r.startTime, endTime, r.interval)
    .then((response) => {
        if (response?.Error === null)
            QuotesEmitter.emit('history', response.Success, r.key, appid); 
        else
            QuotesEmitter.emit('history', [response.Error], r.key, appid);
    });
}

function addListener(eventName, callback)
{
    const list = QuotesEmitter.listeners(eventName);
    if(list.length === 0)
        QuotesEmitter.addListener(eventName, callback);
    
    console.log('listener count on hserver ' + eventName + ' ' + QuotesEmitter.listeners(eventName).length);
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
            subscribe(appid, [request]);
        else
            unsubscribe(appid, [request]);
    }
}

function emit(q, appid) 
{
    if (q.stock_code === 'INDVIX')
        QuotesEmitter.emit('hist-vix', q, appid);
    else
        QuotesEmitter.emit('hist-quote', q, appid);
}
export default {
    getHistory,
    subscribe_vix,
};

*/