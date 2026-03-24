import OpenAlgo from 'openalgo';

var client;
var usercb = new Map();
var connkey = '1b89491151323ed5f76d43ea762a4bae0c2e6086b08ea94bb57c774830f9d307';

function connect(uid, simStartTime, callback)
{
    client = new OpenAlgo(connkey);
    client.connect();
    usercb.set(connkey, callback);
}

function onmessage(q)
{ 
    standardizeq(q);

    var callbackfn = usercb.get(connkey);
    if(callbackfn !== undefined)    
         callbackfn.call(this, q);
    else
        console.error("No callback found for user " + uid + " with quote " + JSON.stringify(q));
}

async function order(p)
{
    var submittime = Date.now();
    var response = await client.placeOrder({
        strategy: p.symbol,
        exchange: p.exc,
        symbol: p.symbol,
        action: p.action,
        pricetype: p.type,
        price: p.price,
        quantity: Math.abs(p.quantity) * p.symbol.startsWith('CRUDE') ? 100 : 65
    });
    var conftime = Date.now();

    response.ctime = conftime;
    response.stime = submittime;
    return response;
}

async function history(p)
{
    var response = await client.history({
        exchange: 'NFO',
        symbol: p.stockCode + p.fExpiry + 'FUT',
        interval: '5m',
        startDate: '2026-03-23',
        endDate: '2026-03-24'
    });
    return response;
}

function subscribe(uid, sublist)
{
    client.subscribe_ltp(sublist, onmessage);
}

function unsubscribe(uid, sublist)
{
    client.unsubscribe_ltp(sublist, onmessage);
}

function quotes(symbol, exchange){
    return client.quotes({symbol: symbol, exchange: exchange});
}

function standardizeq(q) 
{
    q.close = q.ltp;
    q.exchange = q.exchange === 'NSE_INDEX' ? 'NSE' : q.exchange;
    if (q.symbol.endsWith('PE') || q.symbol.endsWith('CE')) {
        var plength = q.exchange === 'MCX' ? -4 : -5;
        q.right = q.symbol.slice(-2) === 'CE' ? 'Call' : 'Put';
        q.strike_price = q.symbol.slice(plength - 2, -2);

        q.expiry_date = q.symbol.slice(plength - 9, plength - 2);
    }
    return q;
} 

export { connect, order, quotes, subscribe, unsubscribe, standardizeq, history };