const expiryTimestampCache = new Map();
const ir = 0.0575;

function addIVNDelta(q, uq) 
{
    if (q !== undefined && uq !== undefined) 
    {
        const flag = q.right === 'CE' ? 'c' : 'p';
        const yearsToExpiry = getYearsToExpiry(uq);
        if(yearsToExpiry < 0)
            throw new Error('invalid input');

        try {
            var iv = js_vollib.black.implied_volatility.implied_volatility(q.ltp, uq.ltp * 0.9972, Number(q.strike_price), ir, yearsToExpiry, flag);
            var delta = js_vollib.black.greeks.analytical.delta(flag, uq.ltp * 0.9972, Number(q.strike_price), ir, yearsToExpiry, iv);

            q.iv = Math.round(iv * 10000) / 100;
            q.delta = Math.round(delta * 10000) / 100;
        } catch (error) {
            console.log('Error occurred while calculating IV and Delta: ' + JSON.stringify(error));
            q.iv = 0;
            q.delta = q.right === 'Call' ? 1 : -1;
        }
    }
    return q;
}

function _addIVNDelta(q, uq)
{
    if(q !== undefined && uq !== undefined)
    {    
        const yearsToExpiry = getYearsToExpiry(q);
        const fdisprice = uq.ltp / 1 + (getYearsToExpiry(uq) * ir);
        const flag = q.right === 'CE' ? 'c' : 'p';

        try{
            var iv = js_vollib.black.implied_volatility.implied_volatility(q.ltp, fdisprice, Number(q.strike_price), ir, yearsToExpiry, flag);
            var delta = js_vollib.black.greeks.analytical.delta(flag, fdisprice, Number(q.strike_price), ir, yearsToExpiry, iv);   
        
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

function getYearsToExpiry(q)
{
    let expiryTime = expiryTimestampCache.get(q.expiry_date);
    if (expiryTime === undefined) {
        const [d, m, y] = [q.expiry_date.slice(0, 2), q.expiry_date.slice(2, 5), q.expiry_date.slice(5)];
        const e = `${d}-${m}-20${y}`;
        const time = q.exchange === 'mcx_fo' ? ', 23:30' : ', 15:40';
        expiryTime = (new Date((e).concat(time))).getTime();
        expiryTimestampCache.set(q.expiry_date, expiryTime);
    }
    return (expiryTime - q.ltt) / 31536000000; // 31536000000 = 1000*60*60*24*365;
}