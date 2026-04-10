const BreezeConnect = require('breezeconnect').BreezeConnect;
require('console-stamp')(console, '[HH:MM:ss.l]');
const utils = require('../common/utils');

const sb = require('./binarysearch');

const appKey = "72r5N3K05754+43ek796960QT96Hc8e1";
const appSecret = "70F8#U89u0v7079r510^9H87L%o592z9";
const sessionId = "55250650";

var breeze = new BreezeConnect({ "appKey": appKey });

    breeze.generateSession(appSecret, sessionId)
    .then((resp) => {
        console.log("Session created");
    }).catch((err) => {
        console.log(err);
    });

function findQuoteByTime(q, lt)
{
    if(lt <= Date.parse(q[q.length-1].datetime))
        return sb.findByTime(q, lt);
    else
        return -2;
}

function findQuote(q, lt)
{
    var firstTick = Date.parse(q[0].datetime);
    var lastTick = Date.parse(q[q.length-1].datetime);

    var startIndex = Math.floor(Math.max((lt - firstTick)/(lastTick - firstTick) - .10, 0) * q.length);
    
    var quoteIndex = -2;
    if(lt <= lastTick) {
        quoteIndex = -1;
        while(quoteIndex === -1 && startIndex < q.length)
        {
            if(Date.parse(q[startIndex].datetime) === lt)
                quoteIndex = startIndex;
            else if(Date.parse(q[startIndex].datetime) > lt)
                quoteIndex = startIndex - 1;
            startIndex++;
        }
    }
    if (quoteIndex === -1 || quoteIndex === -2) 
        console.log("Quote not found " + quoteIndex + " " + startIndex + " " + printObject({q: q[q.length - 1], Time: lt,}));

    return quoteIndex;
}

async function getHistoricalData(st, instrument, sTime) 
{
    var resp = await getHistoricalDatav2(instrument, sTime);
    st.quotes = await resp.Success;
    st.state = 'ready to stream';
    st.lastUpdated = sTime;
    return st;
}

async function getHistory(instrument, sTime, endTime, interval) 
{
    var resp = await getHistoricalDatav2(instrument, sTime, endTime, interval);
    return resp.Success;
}


function getHistoricalDatav2(instrument, sTime, endTime, interval) 
{
    var b = { exchangeCode: instrument.exchange };
    b.interval = interval != undefined ? interval : '1second';
    b.stockCode = instrument.stockCode;
    b.strikePrice = instrument.strike;
    b.right = instrument.right;
    b.productType = instrument.right != undefined ? 'options' : 'futures';
    b.expiryDate = instrument.exchange != 'NSE' ? formatExpiry(instrument.expiry) : undefined;
    b.fromDate = ISODate(sTime);
    b.toDate = endTime != undefined ? ISODate(endTime) : ISODate(sTime + ((16 * 60) * 1000));  

    utils.printObject(b);
    try {
        return breeze.getHistoricalDatav2(b);
    } catch (error) {
        console.error("Error from breeze call " + error + '\n' + error.stack);
        throw error;
    }
}
function ISODate(datetime) {
    return (new Date(Math.round((datetime)/1000) * 1000 + (330 * 60 * 1000))).toISOString();
}

function formatExpiry(expiry) {
    
    if(expiry === undefined)
        return
    
    var e = expiry.slice(0, 2).concat('-').concat(expiry.slice(2, 5)).concat('-20').concat(expiry.slice(5));
    return (new Date((e).concat(', 21:00'))).toISOString(); // add 5.30 to 15:30 to get 21:00 UTC
}

function wssub(list, callback)
{
    breeze.wsConnect();
    breeze.onTicks = callback;

    list.forEach((e) => {
        var b = {
            exchangeCode: e.exchange, 
            stockCode: e.stockCode, 
            getExchangeQuotes:true, 
            interval:"1minute"
        }
        breeze.subscribeFeeds(b)
        .then((resp) => {
            console.log(JSON.stringify(resp))
        });
    });
}

function wsunsub(list)
{
    list.forEach((e) => {
        var b = {
            exchangeCode: e.exchange, 
            stockCode: e.stockCode, 
            getExchangeQuotes:true, 
            interval:"1minute"
        }
        breeze.unsubscribeFeeds(b)
        .then((resp) => {
            console.log(JSON.stringify(resp))
        });
    });
}

function wsDisconnect()
{
    breeze.wsDisconnect();
}

module.exports = {
    findQuoteByTime,
    ISODate,
    formatExpiry,
    getHistoricalData,
    getHistory,
    wssub,
    wsunsub,
    wsDisconnect
};