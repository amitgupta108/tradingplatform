import historyserver from '../../srvr/hserver.mjs';

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

function addQuoteListener(callback)
{
    return historyserver.addListener('quote', callback);
}

function subscribe_vix(appid, mode, action)
{
    return historyserver.subscribe_vix(appid, mode, action);
}

function getHistoricalQuotes(p) {
    return historyserver.getHistory(p);
}

function h_subscribe(appid, instruments, action) 
{
    var requests = instruments.map((inst) => {
        return { appid: appid,
            symbol: inst.symbol,
            instrument: inst
        }
    });
    if (action === 'subs')
        historyserver.subscribe(appid, requests);
    else
        historyserver.unsubscribe(appid, requests);
}

function l_subscribe(appid, instruments, action) 
{
    var requests = instruments.map((inst) => {
        return {
            appid: appid,
            symbol: inst.symbol,
            instrument: inst
        }
    });
    if (action === 'subs')
        historyserver.live_sub(requests, action);
    else
        historyserver.live_sub(requests, action);
}

function changeSpeed(appid, speed)
{
    historyserver.changeSpeed(appid, speed);
}

function start(appid, instruments, mode)
{
    var requests = new Array(0);
    instruments.forEach((inst) => {
        requests.push({ appid: appid,
            symbol: inst.symbol,
            instrument: inst
        });
    });
    if (mode === 'HISTORY') 
        historyserver.start_sim(appid, requests);
    else
        historyserver.live_sub(requests, 'subs');
}   

function pause(appid, action)
{
    return historyserver.pause(appid, action);
}

export default  {
    init,
    getHistoricalQuotes,
    h_subscribe,  
    l_subscribe,  
    changeSpeed,
    addQuoteListener,
    exit,
    connect,
    subscribe_vix,
    start,
    pause
};