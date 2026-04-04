const historyserver = require('../../srvr/hserver');

function connect(uid, time) {
    historyserver.connect(uid, time);
}

function disconnect(uid) {
    historyserver.disconnect(uid, time);
}

function getHistoricalQuotes(p, startTime, endTime, interval) {
    return historyserver.getHistoricalData(p, startTime, endTime, interval);
}

function subscribe(uid, instruments, action, speed) 
{
    var requests = new Array(0);
    instruments.forEach((inst) => {
        requests.push({ uid: uid,
            symbol: inst.symbol,
            instrument: inst
        });
    });
    if (action === 'exit')
        historyserver.dropUser(uid);
    else if(action === 'subs')
        historyserver.subscribe(requests, speed);
    else
        historyserver.unsubscribe(requests);
}

function changeSpeed(uid, speed)
{
    historyserver.changeSpeed(uid, speed);
}

module.exports = {
    connect,
    getHistoricalQuotes,
    subscribe,
    changeSpeed,
    disconnect
};