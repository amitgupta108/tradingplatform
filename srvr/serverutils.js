const sb = require('./binarysearch');

function findQuoteByTime(q, lt)
{
    if(lt <= Date.parse(q[q.length-1].datetime))
        return sb.findByTime(q, lt);
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

function ISODate(datetime) {
    return (new Date(Math.round((datetime)/1000) * 1000 + (330 * 60 * 1000))).toISOString();
}

function formatExpiry(expiry) {
    
    if(expiry === undefined)
        return
    
    var e = expiry.slice(0, 2).concat('-').concat(expiry.slice(2, 5)).concat('-20').concat(expiry.slice(5));
    return (new Date((e).concat(', 21:00'))).toISOString(); // add 5.30 to 15:30 to get 21:00 UTC
}

module.exports = {
    findQuoteByTime,
    findQuote,
    ISODate,
    formatExpiry,
};