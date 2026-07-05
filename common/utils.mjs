//import vollib from '../../js_vollib/build/js_vollib.js';
const expiryTimestampCache = new Map();

function addIVNDelta(q, uq)
{
    const tStart = process.hrtime.bigint();
    if(q !== undefined && uq !== undefined)
    {    
        let expiryTime = expiryTimestampCache.get(q.expiry_date);
        if (expiryTime === undefined) {
            const [d, m, y] = [q.expiry_date.slice(0,2), q.expiry_date.slice(2,5), q.expiry_date.slice(5)];
            const e = `${d}-${m}-20${y}`;
            expiryTime = (new Date((e).concat(', 15:30'))).getTime();
            expiryTimestampCache.set(q.expiry_date, expiryTime);
        }
        
        const yearsToExpiry = (expiryTime - q.ltt)/31536000000; // 31536000000 = 1000*60*60*24*365
        const flag = q.right === 'CE' ? 'c' : 'p';

        try{
            var iv = vollib.black.implied_volatility.implied_volatility(q.ltp, uq.ltp, q.strike_price, 0.0, yearsToExpiry, flag);
            var delta = vollib.black.greeks.analytical.delta(flag, uq.ltp, q.strike_price, yearsToExpiry, 0.0, iv);   
        
            q.delta = Math.round(delta*10000)/100;
        } catch(error) {
            console.log('Error occurred while calculating IV and Delta: ' + JSON.stringify(error));
            q.delta = q.right === 'CE' ? 1 : -1;
        }
    }
    const tEnd = process.hrtime.bigint();
    const tDiff = tEnd - tStart;
    return q;
}

function filter(collection, fO)
{
    var fResults = collection.filter((element) => 
    {
        var a = true; var b = true; var c = true; var d = true;
        var e = true; var f = true; var g = true; var h = true;
        var j = true; var k = true; var l = true; var m = true;

        if(fO.keys != undefined) 
            a = fO.keys.includes(element.key);
        
        if(fO.toStream != undefined)
            b = fO.toStream.includes(element.toStream);

        if(fO.states != undefined)
            c = fO.states.includes(element.streamState);

        if(fO.stockCodes != undefined)
            d = fO.stockCodes.includes(element.stockCode);

        if(fO.expiries != undefined)
            e = fO.expiries.includes(element.expiry);

        if(fO.strikes != undefined)
            f = fO.strikes.includes(element.strike);

        if(fO.rights != undefined)
            g = fO.rights.includes(element.right);

        if(fO.notinkeys != undefined)
            h = !fO.notinkeys.includes(element.key);
        
        if (fO.notinstates != undefined)
            j = !fO.notinstates.includes(element.streamState);

        if (fO.symbol != undefined)
            k = fO.symbol.includes(element.symbol);

        if (fO.appid != undefined)
            l = fO.appid.includes(element.appid);

        if (fO.speed != undefined)
            m = fO.speed.includes(element.speed);

        return a && b && c && d && e && f && g && h && j && k && l && m;
    });
    return fResults;
}

function strikes(a, n, g)
{
    a = a/g;
    var strikes = new Array(n * 2); 

    for(var j = 0; j < n ; j++) {
        strikes[j] = {strike: (a + j - n + 2) * g, right: 'PE'};
        strikes[j + n] = {strike: (a + j-1) * g, right: 'CE'};
    }
    return strikes;
}

function _strikes(price, startIdx = 2, endIdx = 7, sz)
{
    const atmIdx = Math.round(price/sz);
    const idxs = endIdx - startIdx;
    var strikes = new Array(idxs * 2); 

    for(var j = startIdx; j <= endIdx ; j++) {
        strikes[j - startIdx] = {strike: (atmIdx - j) * sz, right: 'PE'};
        strikes[j + idxs - startIdx + 1] = {strike: (atmIdx + j) * sz, right: 'CE'};
    }
    return strikes;
}

const safeAwait = (promise) => 
  promise
    .then(data => [null, data])
    .catch(err => [err, null]);

export default {
    addIVNDelta,
    filter,
    strikes,
    _strikes  
};