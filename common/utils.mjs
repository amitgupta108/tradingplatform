import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const vollib = require('../../js_vollib-master/build/js_vollib').js_vollib;
const regex = /Time/;

function addIVNDelta(q, uq)
{
    if(q !== undefined && uq !== undefined)
    {    
        if(q.expiry_date.length === 7)
            var e = q.expiry_date.slice(0, 2).concat('-').concat(q.expiry_date.slice(2, 5)).concat('-20').concat(q.expiry_date.slice(5));
        else
            var e = q.expiry_date;

        const yearsToExpiry = ((new Date((e).concat(', 15:30'))).getTime() - q.ltt)/(1000*60*60*24*365);
        const flag = q.right === 'Call' ? 'c' : 'p';

        try{
            var iv = vollib.black_scholes.implied_volatility.implied_volatility(q.ltp, uq.ltp, q.strike_price, yearsToExpiry, 0.05, flag);
            var delta = vollib.black_scholes.greeks.analytical.delta(flag, uq.ltp, q.strike_price, yearsToExpiry, 0.05, iv);   
        
            q.iv = Math.round(iv*10000)/100;
            q.delta = Math.round(delta*10000)/100;
        } catch(error) {
            console.log(error);
            q.iv = 0;
            q.delta = q.right === 'Call' ? 1 : -1;
        }
    }
    return q;
}

function printObject(element)
{
    console.log(JSON.stringify(element, stringifyModifier));
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

        if (fO.uid != undefined)
            l = fO.uid.includes(element.uid);

        if (fO.speed != undefined)
            m = fO.speed.includes(element.speed);

        return a && b && c && d && e && f && g && h && j && k && l & m;
    });
    return fResults;
}

function stringifyModifier(key, value)
{
    if(key === 'quotes' && value != undefined)
        return "quotes array present " + value.length;
    else if(regex.test(key))
        return new Date(value).toLocaleTimeString();
    else
        return value;
}

function useMeToCallAnything(f, a)
{
  var startTime = Date.now();
  var r = f.apply(this, a);
  var endTime = Date.now();

  return {r: r, t: (endTime-startTime),};
}

function compareExecTime(f1, a1, f2, a2)
{
   if(f1 === undefined)
    return;

    var r1 = useMeToCallAnything(f1, a1);
    
    if(f2 != undefined)
        var r2 = useMeToCallAnything(f2, a2);
    else
        var r2 = {r: undefined, t:0,};

   return [r1.r, r2.r, r1.t - r2.t];
}

function strikes(a, n)
{
    a = a/50;
    var strikes = new Array(n * 2); 

    for(var j = 0; j < n ; j++) {
        strikes[j] = {strike: (a + j - n + 2) * 50, right: 'Put'};
        strikes[j + n] = {strike: (a + j-1) * 50, right: 'Call'};
    }
    return strikes;
}

export default {
    addIVNDelta,
    printObject,
    filter,
    compareExecTime,
    strikes
  };