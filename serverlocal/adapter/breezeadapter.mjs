/*import historyserver from '../../srvr/hserver.mjs';

function init(appid, startTime, speed)
{
    return historyserver.clientInit(appid, startTime, speed);
}

function exit(appid)
{
    return historyserver.clear(appid);
}
*/
function getHistory(appid, requests) {
    const promises = [];
    /*
    requests.forEach((r) => {
        if (r.exchange === 'MCX')
            return;
        
        r.exchange = ['index', 'vix'].includes(r.key) ? 'NSE' : 'NFO';
        r.stockCode = r.key === 'vix' ? 'INDVIX' : r.stockCode;
        r.expiry = r.fExpiry || r.oExpiry;

        promises.push(historyserver.getHistory(appid, r));
    });*/
    return Promise.all(promises);
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