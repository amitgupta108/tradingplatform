import OpenAlgo from 'openalgo';
import qserver from '../quotes.js';

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
    client.connect();
    uid = cuid;
    
}

function disconnect(cuid, scrip)
{
    /*var idx = uidscripmapping.findIndex((s) => s.scrip === scrip);
    uidscripmapping.splice(idx, 1);
    //client.disconnect();
    */
}

function onmessage(q)
{ 
    qserver.emitQuotes(uid, q, 'live');
}

function subscribe(uid, sublist, action)
{
    if(action === 'subs')
        client.subscribe_ltp(sublist, onmessage);
    else 
        client.unsubscribe_ltp(sublist, onmessage);
}

async function positionbook(uid, scrip)
{
    return await client.positionbook();
    //split positionbook
}
   
async function order(p)
{
    var submittime = Date.now();
    if(p.type === 'LIMIT' && Number(p.price) < 2)
        throw Error('Limit price close to 0');

    var response = await client.placeOrder({
        strategy: p.symbol,
        exchange: p.exc,
        symbol: p.symbol,
        action: p.action,
        pricetype: p.type,
        product: 'NRML',
        price: p.price === '' ? 0 : p.price,
        quantity: Math.abs(p.quantity)
    });
    var conftime = Date.now();

    response.ctime = conftime;
    response.stime = submittime;
    return response;
}

async function orderstatus(orderid)
{
    var status = await client.orderStatus({orderid: orderid,
            orderId: orderid
        });
    
    return status.data;
}

function quotes(symbol, exchange){
    return client.quotes({symbol: symbol, exchange: exchange});
}

export { connect, order, quotes, subscribe, positionbook, orderstatus, disconnect };