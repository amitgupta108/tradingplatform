const historyserver = require('../../srvr/hserver');

function connect(uid, time) {
    historyserver.connect(uid, time);
}

function getHistoricalQuotes(p, startTime, endTime, interval) {
    return historyserver.getHistoricalData(p, startTime, endTime, interval);
}

function subscribe(uid, instruments, action) 
{
    var requests = new Array(0);
    instruments.forEach((inst) => {
        requests.push({ uid: uid,
            symbol: inst.symbol,
            instrument: inst
        });
    });
    if(action)
        historyserver.subscribe(requests);
    else
        historyserver.unsubscribe(requests);
}

module.exports = {
    connect,
    getHistoricalQuotes,
    subscribe
};