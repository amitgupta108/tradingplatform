const vollib = require('../../js_vollib-master/build/js_vollib').js_vollib;
require('console-stamp')(console, '[HH:MM:ss.l]');
var regex = /Time/;

function addIVNDelta(q, uq)
{
    if(q.expiry_date.length === 7)
        var e = q.expiry_date.slice(0, 2).concat('-').concat(q.expiry_date.slice(2, 5)).concat('-20').concat(q.expiry_date.slice(5));
    else
        var e = q.expiry_date;

    var yearsToExpiry = ((new Date((e).concat(', 15:30'))).getTime() - q.ltt)/(1000*60*60*24*365);
    var flag = q.right === 'Call' ? 'c' : 'p';

    var iv = vollib.black_scholes.implied_volatility.implied_volatility(q.close, uq.close, q.strike_price, yearsToExpiry, 0.05, flag);
    var delta = vollib.black_scholes.greeks.analytical.delta(flag, uq.close, q.strike_price, yearsToExpiry, 0.05, iv);   
    q.iv = Math.round(iv*10000)/100;
    q.delta = Math.round(delta*10000)/100;

    var atmStrike = Math.round(uq.close/50) * 50;
    if(atmStrike === q.close)
        quote.atm = true;

    return q;
}

function trimQuotes(q, lt)
{        
    let { exchange_code, high, low, open, open_interest, product_type, volume, ...trimmedQuote} = q;
    return trimmedQuote;
}

function printArguments(fArgs)
{
    console.log(this.name + " " + printObject(fArgs));
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
        var j = true; var k = true; var l = true;

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

        return a && b && c && d && e && f && g && h && j && k && l;
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
        strikes[j] = {strike: (a - (n) + j+1) * 50, right: 'Put'};
        strikes[j + n] = {strike: (a + j) * 50, right: 'Call'};
    }
    return strikes;
}

module.exports = {
    addIVNDelta,
    printObject,
    filter,
    compareExecTime,
    strikes
  };