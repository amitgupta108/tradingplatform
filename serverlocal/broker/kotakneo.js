import OpenAlgo from 'openalgo';
import qserver from '../quotes.js';
import adapter from '../adapter/histadapter.js';

var uidscripmapping = new Array(0);
const connkey = '1b89491151323ed5f76d43ea762a4bae0c2e6086b08ea94bb57c774830f9d307';
const client = new OpenAlgo(connkey);
var uid;

function connect(cuid, scrip)
{
    /*var existing = uidscripmapping.find((s) => s.scrip === scrip);
    if(existing !== undefined)
        throw Error('user scrip combination already exist'); //may be extendable using rooms?
    uidscripmapping.push({uid: cuid, scrip: scrip})
    */
    try {
        client.connect();
        uid = cuid;
    } catch (error) {
        console.error('Error connection to openalgo ' + error);
    }
}

function disconnect(cuid, scrip)
{
    /*var idx = uidscripmapping.findIndex((s) => s.scrip === scrip);
    uidscripmapping.splice(idx, 1);
    */
    client.disconnect();
}

function onQuotes(q)
{ 
    qserver.emitQs(uid, standardizeoq(q));
}

function standardizeoq(q) 
{
    q.ltp = Number(q.ltp);
    q.ltt = Number(q.ltt);
    q.close = (q.ltp);
    q.open = q.ltp;
    q.high = q.ltp;
    q.low = q.ltp;
    q.exchange = q.exchange === 'NSE_INDEX' ? 'NSE' : q.exchange;
    if (q.symbol.endsWith('PE') || q.symbol.endsWith('CE')) {
        q.right = q.symbol.slice(-2) === 'CE' ? 'Call' : 'Put';

        var strike = q.symbol.slice(-9, -2);
        var digit5 = Number.isFinite(Number(strike));
        q.strike_price = digit5 ? strike.slice(2, 7) : strike.slice(3, 7);
        q.expiry_date = digit5 ? q.symbol.slice(-14, -7) : q.symbol.slice(-13, -6);
        q.stockCode = digit5 ? q.symbol.slice(0, -14) : q.symbol.slice(0, -13);
    }
    return q;
} 

function subscribe(uid, sublist, action)
{
    var originalpath = sublist.filter((item) => item.source !== 'icicilive');
    if(action === 'subs')
        client.subscribe_ltp(originalpath, onQuotes);
    else 
        client.unsubscribe_ltp(originalpath, onQuotes);
    
    var redirectedpath = sublist.filter((item) => item.source === 'icicilive');
    adapter.wsLive(uid, redirectedpath, action);
}

async function orderbook(uid, scrip)
{
    var response = await client.orderbook();
    if(response.status === 'success')
    {
        var orders = response.data.orders.filter((o) => {
            o.state = o.order_status;
            return o.symbol.startsWith(scrip.stockCode);
        });
    }
    return orders;
}

async function order(uid, orders)
{
    var fOrders = formatorder(orders);
    var response;
    if(fOrders.length === 1)
        response = await client.placeOrder(fOrders[0]);
    else if( fOrders.length > 1)
        response = await client.basketOrder(fOrders);
    console.log(JSON.stringify(response));
    return response;
}

function formatorder(orders)
{
    return orders.map((o) => {
        let { cprice, orderN, state, time, stockCode, ...trimmedOrder} = o;
        return trimmedOrder;
    });   
}

export { connect, order, subscribe, orderbook, disconnect };