import utils from '../common/utils.mjs';
import { findByTime } from './binarysearch.mjs';

const { BreezeConnect } = await import('breezeconnect');
const breeze = new BreezeConnect({ "appKey": '72r5N3K05754+43ek796960QT96Hc8e1'});
const appSecret = "70F8#U89u0v7079r510^9H87L%o592z9";

connect(appSecret, '55613340');

function connect(appSecret, sessionId){
    breeze.generateSession(appSecret, sessionId);
    breeze.wsConnect();
    
    console.log("Session created");
}

function findQuoteByTime(q, lt)
{
    if(lt <= Date.parse(q.at(-1).datetime))
        return findByTime(q, lt);
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
    //var d = new Date(expiry).toString();
    var e = expiry.slice(0, 2).concat('-').concat(expiry.slice(2, 5)).concat('-20').concat(expiry.slice(5));
    return (new Date((e).concat(', 21:00'))).toISOString(); // add 5.30 to 15:30 to get 21:00 UTC
}

function wssub(list, callback)
{
    breeze.onTicks = callback;

    list.forEach((e) => {
        var b = breeze_input(e.instrument);
        breeze.subscribeFeeds(b)
        .then((resp) => {
            console.log('ICICI feed subs: ' + JSON.stringify(resp));
        }).catch((error) => {
            console.log('ICICI feed subs error: ' + error);
        });
    });
}

function wsunsub(list)
{
    list.forEach((e) => {
        var b = breeze_input(e.instrument);
        
        breeze.unsubscribeFeeds(b)
        .then((resp) => {
            console.log('ICICI feed unsubs: ' + resp)
        }).catch((error) => {
            console.log('ICICI feed unsubs error: ' + error);
        });
    });
}

function wsDisconnect()
{
    breeze.wsDisconnect();
}

function breeze_input(scrip)
{       
    var b = {expiryDate: formatExpiry(scrip.expiry)};
    b.productType = scrip.right != undefined ? 'options' : 'futures';
    b.exchangeCode = scrip.stockCode === 'INDVIX' ? 'NSE' : scrip.exchange;
    b.stockCode = scrip.stockCode === 'CRUDEOIL' ? scrip.stockCode.slice(0, 5) : scrip.stockCode;
    b.strikePrice = scrip.strike;
    b.right = scrip.right;
    b.getExchangeQuotes = true;
    b.interval = "1second";
    
    return b;
}

export default {
    findQuoteByTime,
    getHistoricalData,
    getHistory,
    wssub,
    wsunsub,
    wsDisconnect
};