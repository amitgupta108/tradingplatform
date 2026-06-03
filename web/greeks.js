const expiryTimestampCache = new Map();

function addIVNDelta(q, uq)
{
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
        const flag = q.right === 'Call' ? 'c' : 'p';

        try{
            var iv = js_vollib.black.implied_volatility.implied_volatility(q.ltp, uq, Number(q.strike_price), 0.0, yearsToExpiry, flag);
            var delta = js_vollib.black.greeks.analytical.delta(flag, uq, Number(q.strike_price), yearsToExpiry, 0.0, iv);   
        
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