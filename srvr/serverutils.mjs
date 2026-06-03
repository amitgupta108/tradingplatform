import { findByTime } from './binarysearch.mjs';

const { BreezeConnect } = await import('breezeconnect');
const breeze = new BreezeConnect({ "appKey": '72r5N3K05754+43ek796960QT96Hc8e1'});
const appSecret = "70F8#U89u0v7079r510^9H87L%o592z9";
let ws_callback;

function connect(sessionId, with_socket = true, callback) {
    breeze.generateSession(appSecret, sessionId)
    .then((resp) => {
        console.log("Breeze session generated");

        if (with_socket) {
            breeze.wsConnect();
            ws_callback = callback;
            breeze.onTicks = ws_callback;
            console.log("Breeze websocket initialized");
        }
    }).catch((error) => {
        console.log("Error generating Breeze session " + error);
    });
}

function findQuoteByTime(q, lt)
{
    const lastQuote = q.at(-1);
    if(lt <= lastQuote.ltt)
        return findByTime(q, lt);
    else
        return -2;
}

async function getHistoricalData(st, instrument, sTime) 
{
    var resp = await getHistoricalDatav2(instrument, sTime);
    var quotes = resp.Success;
    if (Array.isArray(quotes)) {
        quotes.forEach((q) => {
            q.ltt = Date.parse(q.datetime);
        });
    }
    st.quotes = quotes;
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
    b.productType = instrument.right !== undefined ? 'options' : 'futures';
    b.expiryDate = instrument.exchange !== 'NSE' ? formatExpiry(instrument.expiry, 'datetime') : undefined;
    b.fromDate = ISODate(sTime);
    b.toDate = endTime != undefined ? ISODate(endTime) : ISODate(sTime + ((16 * 60) * 1000));  

    console.log(JSON.stringify(b));
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

function formatExpiry(expiry, type) {
    var e = expiry.slice(0, 2).concat('-').concat(expiry.slice(2, 3)).concat(expiry.slice(3, 5).toLowerCase()).concat('-20').concat(expiry.slice(5));
    return type === 'datetime' ? (new Date((e).concat(', 21:00'))).toISOString() : e; // add 5.30 to 15:30 to get 21:00 UTC
}

function wssub(list, action)
{
    list.forEach((e) => {
        var b = breeze_input(e.instrument);
        var promise;
        if(action === 'subs')
            promise = breeze.subscribeFeeds(b);
        else
            promise = breeze.unsubscribeFeeds(b);

        promise.then((resp) => {
            console.log('ICICI feed ' + action + ': ' + JSON.stringify(resp));
        }).catch((error) => {
            console.log('ICICI feed ' + action + ' error: ' + error);
        });
    });
}

function wsDisconnect()
{
    breeze.wsDisconnect();
}

function breeze_input(scrip)
{       
    var b = {getExchangeQuotes: true}
    b.productType = scrip.right != undefined ? 'options' : 'futures';
    b.exchangeCode = scrip.stockCode === 'INDVIX' ? 'NSE' : scrip.exchange;
    b.stockCode = scrip.stockCode === 'CRUDEOIL' ? scrip.stockCode.slice(0, 5) : scrip.stockCode;
    b.expiryDate = scrip.expiry !== undefined ? formatExpiry(scrip.expiry, 'date') : undefined;
    b.strikePrice = scrip.strike;
    b.right = scrip.right;
    b.interval = "1second";
    
    return b;
}

function subscribe_vix(action)
{
    var b = {exchangeCode: 'NSE', stockCode: 'INDVIX', getExchangeQuotes: true, interval: '1second'};
    var promise;
    if(action === 'subs')
        promise = breeze.subscribeFeeds(b);
    else
        promise = breeze.unsubscribeFeeds(b);

    promise.then((resp) => {
        console.log('VIX feed ' + action + ': ' + JSON.stringify(resp));
    }).catch((error) => {
        console.log('VIX feed ' + action + ' error: ' + error);
    });
}

export default {
    connect,
    findQuoteByTime,
    getHistoricalData,
    getHistory,
    wssub,
    wsDisconnect,
    subscribe_vix
};