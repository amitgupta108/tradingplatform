const expiryTimestampCache = new Map();

function addIVNDelta(q, uq)
{
    if(q !== undefined && uq !== undefined)
    {    
        let expiryTime = expiryTimestampCache.get(q.expiry_date);
        if (expiryTime === undefined) {
            const [d, m, y] = [q.expiry_date.slice(0,2), q.expiry_date.slice(2,5), q.expiry_date.slice(5)];
            const e = `${d}-${m}-20${y}`;
            const time = q.exchange === 'MCX' ? ', 23:30' : ', 15:30';
            expiryTime = (new Date((e).concat(time))).getTime();
            expiryTimestampCache.set(q.expiry_date, expiryTime);
        }
        
        const yearsToExpiry = (expiryTime - q.ltt)/31536000000; // 31536000000 = 1000*60*60*24*365
        const flag = q.right === 'CE' ? 'c' : 'p';

        try{
            var iv = js_vollib.black_scholes.implied_volatility.implied_volatility(q.ltp, uq.ltp, Number(q.strike_price), yearsToExpiry, 0.07, flag);
            var delta = js_vollib.black_scholes.greeks.analytical.delta(flag, uq.ltp, Number(q.strike_price), yearsToExpiry, 0.07, iv);   
        
            q.iv = Math.round(iv*10000)/100;
            q.delta = Math.round(delta*10000)/100;
        } catch(error) {
            console.log('Error occurred while calculating IV and Delta: ' + JSON.stringify(error));
            q.iv = 0;
            q.delta = q.right === 'Call' ? 1 : -1;
        }
    }
    return q;
}