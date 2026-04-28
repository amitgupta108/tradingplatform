
import historyserver from '../../srvr/hserver.mjs';
import qServer from '../quotes.mjs';

historyserver.addListener('strikex', receieveQs);
historyserver.addListener('index', receieveQs);
historyserver.addListener('vix', receieveQs);
historyserver.addListener('futures', receieveQs);

function init(uid, startTime, speed)
{
    historyserver.clientInit(uid, startTime, speed);
}

function exit(uid)
{
    historyserver.exit(uid);
}

function getHistoricalQuotes(p, startTime, endTime, interval) {
    return historyserver.getHistory(p, startTime, endTime, interval);
}

function subscribe(uid, instruments, action) 
{
    var requests = new Array(0);
    instruments.forEach((inst) => {
        requests.push({ uid: uid,
            symbol: inst.symbol,
            instrument: inst
        });
    });
    if (action === 'subs')
        historyserver.subscribe(requests);
    else if(action === 'unsuball')
        historyserver.unsubscribeall(uid);
    else
        historyserver.unsubscribe(requests);
}

function changeSpeed(uid, speed)
{
    historyserver.changeSpeed(uid, speed);
}

function wsLive(uid, list, action)
{
    historyserver.wsLive(uid, list, action);
}

function receieveQs(q, uid, imode)
{
    var q = standardizeiq(q);
    qServer.emitQs(uid, q);
}

function addListener(type, callback)
{
    historyserver.addListener(type, callback);
}

function standardizeiq(q) 
{
    q['exchange'] = q['exchange_code'];
    q['type'] = q['product_type'];

    if(q.exchange != 'NSE')
        q.expiry_date = q.expiry_date.replaceAll('-20', '').replaceAll('-', '');

    q.ltt = Date.parse(q.datetime);
    
    return q;
}

export default  {
    init,
    getHistoricalQuotes,
    subscribe,  
    changeSpeed,
    wsLive,
    addListener,
    exit
};