import OpenAlgo from 'openalgo';
import qserver from '../quotes.js';

//const qserver = require('../quotes');
//const oaApi = require('openalgo').OpenAlgo;
var client;
var uid;
var connkey = '1b89491151323ed5f76d43ea762a4bae0c2e6086b08ea94bb57c774830f9d307';

function connect(cuid)
{
    client = new OpenAlgo(connkey);
    client.connect();
    uid = cuid;
}

function onmessage(q)
{ 
    qserver.emitQuotes(uid, q, 'live');
}

function subscribe(uid, sublist)
{
    client.subscribe_ltp(sublist, onmessage );
}

function unsubscribe(uid, sublist)
{
    client.unsubscribe_ltp(sublist, onmessage);
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
    var status = await client.orderStatus({orderid: orderid,
            orderId: orderid
        });
    
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



function quotes(symbol, exchange){
    return client.quotes({symbol: symbol, exchange: exchange});
}



export { connect, order, quotes, subscribe, unsubscribe, history, orderstatus };