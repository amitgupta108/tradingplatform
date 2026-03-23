const historyserver = require('../../srvr/hserver');

var connected = false;

function connect(callback) {
    historyserver.connect(callback);
    connected = true;
}

function getHistoricalQuotes(p, startTime, endTime, interval) {
    return historyserver.getHistoricalData(p, startTime, endTime, interval);
}


function subscribe_ltp(symbol) {
    requests.forEach((request) => {
        subslist.set(request.instrument.symbol, {
            instrument: request.instrument,
            toStream: request.toStream,
            time: request.time,
            callback: request.callback
        });
    });

    subslist.forEach((v, k) => {
        if (v.toStream && (qStore.get(k) === undefined || qStore.get(k).quotes.length === 0)) {
            qStore.set(k, { symbol: k, quotes: new Array(0), state: 'load requested', time: v.time });
            qw(v.instrument, v.time);
        }
    });
}

function onmessage(q) {
    genericCallback(q);
}


module.exports = {
    connect,
    getHistoricalQuotes,
    subscribe_ltp,
};