import OpenAlgo from 'openalgo';

var client;

function connect()
{
    client = new OpenAlgo('1b89491151323ed5f76d43ea762a4bae0c2e6086b08ea94bb57c774830f9d307');
    client.connect();
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

function subscribe(sublist, callback)
{
    client.subscribe_ltp(sublist, callback);
}

function unsubscribe(sublist)
{
    client.unsubscribe_ltp(sublist);
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

export { connect, order, quotes, subscribe, unsubscribe, standardizeq };