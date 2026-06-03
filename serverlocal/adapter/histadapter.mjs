import historyserver from '../../srvr/hserver.mjs';

function connect(sessionId, with_socket)
{
    historyserver.connect(sessionId, with_socket);
}

function init(appid, startTime, speed)
{
    historyserver.clientInit(appid, startTime, speed);
}

function exit(appid)
{
    historyserver.exit(appid);
}

function addQuoteListener(callback)
{
    historyserver.addListener('quote', callback);
}

function subscribe_vix(action)
{
    historyserver.subscribe_vix(action);
}

function getHistoricalQuotes(p) {
    return historyserver.getHistory(p);
}

function subscribe(appid, instruments, action) 
{
    var requests = new Array(0);
    instruments.forEach((inst) => {
        requests.push({ appid: appid,
            symbol: inst.symbol,
            instrument: inst
        });
    });
    if (action === 'subs')
        historyserver.subscribe(requests);
    else if(action === 'unsuball')
        historyserver.unsubscribeall(appid);
    else
        historyserver.unsubscribe(requests);
}

function changeSpeed(appid, speed)
{
    historyserver.changeSpeed(appid, speed);
}

export default  {
    init,
    getHistoricalQuotes,
    subscribe,  
    changeSpeed,
    addQuoteListener,
    exit,
    connect,
    subscribe_vix
};