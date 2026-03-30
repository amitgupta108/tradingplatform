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

function onmessage(uid, q)
{ 
    standardizeq(q);

    var callbackfn = usercb.get(uid);
    if(callbackfn !== undefined)    
         callbackfn.call(this, q);
    else
        console.error("No callback found for user " + uid + " with quote " + JSON.stringify(q));
}

function standardizeq(q) 
{
    q['exchange'] = q['exchange_code'];
    q['type'] = q['product_type'];

    if(q.exchange != 'NSE')
        q.expiry_date = q.expiry_date.replaceAll('-20', '').replaceAll('-', '');

    if (q.type === 'Options')
        q.symbol = q.stock_code + q.expiry_date + q.strike_price + (q.right === 'Call' ? 'CE' : 'PE');
    else if (q.type === 'Futures')
        q.symbol = q.stock_code + q.expiry_date + 'FUT';

    q.ltt = Date.parse(q.datetime);
    
    return q;
}
module.exports = {
    connect,
    getHistoricalQuotes,
    subscribe
};