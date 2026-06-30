import historyserver from '../../srvr/qserver.mjs';

function connect()
{
    return historyserver.connect();
}

function init(appid, startTime, speed)
{
    return historyserver.clientInit(appid, startTime, speed);
}

function exit(appid)
{
    return historyserver.clear(appid);
}

function addQuoteListener(eventName, callback)
{
    return historyserver.addListener(eventName, callback);
}

function subscribe_vix(appid, mode, action)
{
    return historyserver.subscribe_vix(appid, mode, action);
}

function getHistory(p) {
    if(p.exchange === 'MCX')
        return;

    p.exchange = p.key === 'index' || p.key === 'vix' ? 'NSE' : 'NFO';
    p.stockCode = p.key === 'vix' ? 'INDVIX' : p.stockCode;
    p.expiry = p.fExpiry;
    
    return historyserver.getHistory(p);
}

function buildRequests(appid, instruments) {
    return instruments.map((inst) => {
        return {
            appid: appid,
            symbol: inst.symbol,
            instrument: inst
        }
    });
}

function h_subscribe(appid, instruments, action) 
{
    var requests = buildRequests(appid, instruments);

    if (action === 'subs')
        historyserver.subscribe(appid, requests);
    else
        historyserver.unsubscribe(appid, requests);
}

function l_subscribe(appid, instruments, action) 
{
    var requests = buildRequests(appid, instruments);

    if (action === 'subs')
        historyserver.live_sub(requests, action);
    else
        historyserver.live_sub(requests, action);
}

function start(appid, instruments, mode)
{
    var requests = buildRequests(appid, instruments);
    
    if (mode === 'HISTORY') 
        historyserver.start_sim(appid, requests);
    else
        historyserver.live_sub(requests, 'subs');
}   

function changeSpeed(appid, speed) {
    historyserver.changeSpeed(appid, speed);
}

function pause(appid, action)
{
    return historyserver.pause(appid, action);
}

export default  {
    init,
    getHistory,
    h_subscribe,  
    l_subscribe,  
    changeSpeed,
    addQuoteListener,
    exit,
    connect,
    subscribe_vix,
    start,
    pause,
};