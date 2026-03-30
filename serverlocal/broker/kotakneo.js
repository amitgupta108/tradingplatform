import OpenAlgo from 'openalgo';

var client;
var usercb = new Map();
var connkey = '1b89491151323ed5f76d43ea762a4bae0c2e6086b08ea94bb57c774830f9d307';

function connect(uid, simStartTime, callback)
{
    client = new OpenAlgo(connkey);
    client.connect();
    usercb.set(uid, callback);
}

function onmessage(q, uid)
{ 
    standardizeq(q);

    var callbackfn = usercb.get(uid);
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

async function orderstatus(orderid)
{
    var status = await client.orderStatus({
        orderId: orderid});
    
    var modstatus = status.data;
    modstatus.average_price = Math.round(Number(status.data.price)) + Math.round((new Date()).getMilliseconds()/100) * 0.05
                    + (status.data.action === 'BUY' ? 20 : -20);
    modstatus.filled_quantity = status.data.quantity;
    modstatus.pending_quantity = 0;
    modstatus.status = status.status;
    modstatus.mode = status.mode;

    return modstatus;
}

async function history(p)
{
    var response = await client.history({
        exchange: symbol.startsWith('CRUDE') ? 'MCX' : 'NFO',
        symbol: p.stockCode + p.fExpiry + 'FUT',
        interval: '5m',
        startDate: '2026-03-23',
        endDate: '2026-03-24'
    });
    return response;
}

function subscribe(uid, sublist)
{
    client.subscribe_ltp(sublist, ((q) => {
        onmessage(q, uid);
    }));
}

function unsubscribe(uid, sublist)
{
    client.unsubscribe_ltp(sublist, ((q) => {
        onmessage(q, uid);
    }));
}

function quotes(symbol, exchange){
    return client.quotes({symbol: symbol, exchange: exchange});
}

function standardizeq(q) 
{
    q.close = q.ltp;
    q.exchange = q.exchange === 'NSE_INDEX' ? 'NSE' : q.exchange;
    if (q.symbol.endsWith('PE') || q.symbol.endsWith('CE')) {
        q.right = q.symbol.slice(-2) === 'CE' ? 'Call' : 'Put';

        var strike = q.symbol.slice(-9, -2);
        var digit5 = Number.isFinite(Number(strike));
        q.strike_price = digit5 ? strike.slice(2, 7) : strike.slice(3, 7);
        q.expiry_date = digit5 ? q.symbol.slice(-14, -7) : q.symbol.slice(-13, -6);
    }
    return q;
} 

export { connect, order, quotes, subscribe, unsubscribe, standardizeq, history, orderstatus };