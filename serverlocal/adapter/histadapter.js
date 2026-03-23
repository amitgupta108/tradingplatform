const historyserver = require('../../srvr/hserver');

var usercb = new Map();

function connect(uid, time, callback) {
    historyserver.connect(uid, time, onmessage);
    usercb.set(uid, callback);
}

function getHistoricalQuotes(p, startTime, endTime, interval) {
    return historyserver.getHistoricalData(p, startTime, endTime, interval);
}

function subscribe(uid, instruments, action) 
{
    var requests = new Array(0);
    instruments.forEach((inst) => {
        requests.push({ key: uid,
            instrument: inst
        });
    });
    if(action)
        historyserver.subscribe(requests);
    else
        historyserver.unsubscribe(requests);
}

function onmessage(uid, q)
{ 
    var callbackfn = usercb.get(uid);
    if(callbackfn !== undefined)    
         callbackfn.call(this, q);
    else
        console.error("No callback found for user " + uid + " with quote " + JSON.stringify(q));
}

module.exports = {
    connect,
    getHistoricalQuotes,
    subscribe
};