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

async function getHistoricalData(st, instrument, sTime) 
{
    var resp = await getHistoricalDatav2(instrument, sTime).catch((error) => {
        console.warn("getHistoricalDatav2 failed, ", error.message);
        return Promise.reject(error); 
    });

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
    b.toDate = endTime != undefined ? ISODate(endTime) : ISODate(sTime + ((1 * 60) * 1000));  

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
    b.exchangeCode = scrip.key === 'index' ? 'NSE' : scrip.exchange;
    b.productType = scrip.key === 'futures' ? 'futures' : 'options';
    b.stockCode = scrip.stockCode === 'CRUDEOIL' ? scrip.stockCode.slice(0, 5) : scrip.stockCode;
    b.expiryDate = scrip.expiry !== undefined ? formatExpiry(scrip.expiry, 'date') : undefined;
    b.strikePrice = scrip.strike;
    b.right = scrip.right;
    console.log('subs input ' + JSON.stringify(b));

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

const rename_map = {
    //add new property, same value
    //close: {action:'add', key:'ltp'},
    //new name, modified value
    close: (val) => ({
        newKey: 'ltp',
        newValue: val
    }),
    stock_code: (val) => ({
        newKey: 'stockCode',
        newValue: val === 'CRUDE' ? 'CRUDEOIL' : val
    }),
    datetime: (val) => ({
        newKey: 'ltt',
        newValue: Date.parse(val)
    }),
    //same name, value modification
    expiry_date: (val) => ({
        newKey: 'expiry_date',
        newValue: val.replaceAll('-20', '').replaceAll('-', '').toUpperCase()
    }),
    right: (val) => ({
        newKey: 'right',
        newValue: val === 'Call' ? 'CE' : 'PE'
    }),
    //property rename
    exchange_code: 'exchange',
    right_type: 'right',
    //add new property, derived value    
    volume:  (val) => ({ 
        newKey: ['key', 'symbol'],
        newValue: (q) => {
            var val1;
            var val2;
            
            if(q.exchange !== 'NSE' && q.strike_price !== undefined) {
                val1 = 'strikex';
                const rt = q.right_type ?? (q.right === 'Call' || q.right === 'CE') ? 'CE' : 'PE';
                val2 = q.stockCode + q.expiry_date + q.strike_price + rt;
            }
            else if(q.expiry_date !== undefined) {
                val1 = 'futures';
                val2 = q.stockCode + q.expiry_date + 'FUT';
            }
            else
            {
                val1 = q.stockCode.endsWith('VIX') ? 'vix' : 'index';
                val2 = q.stockCode;
            }
            return [val1, val2];
        }
    }),
    //drop
    product_type: 'drop',
    open_interest: 'drop',
    high: 'drop',
    low: 'drop'
};

function convert(array, map)
{
    const len = array.length;
    for (let i = 0; i < len; i++) 
    {
        const q = array[i];
        const tStart = process.hrtime.bigint();
        for (const oldKey in map)
        {
            if (oldKey in q)
            {
                const config = map[oldKey];
                if (typeof config === 'function') 
                {        
                   const { newKey, newValue } = config(q[oldKey]);
                    {
                        if(typeof newValue !== 'function') {
                            q[newKey] = q[oldKey];
                            q[newKey] = newValue;
                            if(newKey !== oldKey)
                                delete q[oldKey];
                        }
                        else if(typeof newValue === 'function') {
                            const r = newValue(q);
                            q[newKey[0]] = r[0];
                            q[newKey[1]] = r[1];
                        }
                    }
                } 
                else if(config === 'drop') {
                    delete q[oldKey];
                }
                else if(typeof config === 'string') {
                    q[config] = q[oldKey];
                    delete q[oldKey];
                }
            }
        }
        const tStart = process.hrtime.bigint();
        q.tDiff = tEnd - tStart;
    }  
    return array;
}


export default {
    connect,
    getHistoricalData,
    getHistory,
    wssub,
    wsDisconnect,
    subscribe_vix
};