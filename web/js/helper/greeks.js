const expiryTimestampCache = new Map();
const ir = 0.0525;


function addIVNDelta(q, uq) {
    if (q !== undefined && uq !== undefined) {
        const flag = q.right === 'CE' ? 'c' : 'p';
        const yearsToExpiry = getYearsToExpiry(uq);
        if (yearsToExpiry < 0)
            throw new Error('invalid input');

        let df = 1 - (ir * yearsToExpiry);
        try {
            var iv = js_vollib.black.implied_volatility.implied_volatility(q.ltp, uq.ltp * df, Number(q.strike), ir, yearsToExpiry, flag);
            var delta = js_vollib.black.greeks.analytical.delta(flag, uq.ltp * df, Number(q.strike), ir, yearsToExpiry, iv);

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

function getYearsToExpiry(q) {
    let expiryTime = expiryTimestampCache.get(q.expiry);
    if (expiryTime === undefined) {
        const [d, m, y] = [q.expiry.slice(0, 2), q.expiry.slice(2, 5), q.expiry.slice(5)];
        const e = `${d}-${m}-20${y}`;
        const time = q.exchange === 'mcx_fo' ? ', 23:30' : ', 15:40';
        expiryTime = (new Date((e).concat(time))).getTime();
        expiryTimestampCache.set(q.expiry, expiryTime);
    }
    return (expiryTime - q.ltt) / 31536000000; // 31536000000 = 1000*60*60*24*365;
}