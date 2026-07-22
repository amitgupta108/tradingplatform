import sutils from './breezeclient.mjs';
import { QuotesEmitter, breeze } from './appstate.mjs';

connect();
function connect() {
    breeze.generateSession(process.env.breeze_secret, process.env.breeze_sid)
        .then((resp) => {
            breeze.wsConnect();
            breeze.onTicks = wsemit;
            console.error('breeze session started ');
        }).catch((error) => {
            console.error('breeze start session ' + error);
        });
}

function getHistoryAsync(instrument, startTime, endTime, interval)
{
    return sutils.getHistory(instrument, startTime, endTime, interval);
}

function getHistory(appid, r) 
{
    return sutils.getHistory(r, r.startTime, r.endTime, r.interval)
    .then((response) => {
        if (response?.Error === null)
            QuotesEmitter.emit('history', response.Success, r.key, appid);
        else
            QuotesEmitter.emit('history', [response.Error], r.key, appid);
    });
}

function addListener(eventName, callback)
{
    const list = QuotesEmitter.listeners(eventName);
    if(list.length === 0)
        QuotesEmitter.addListener(eventName, callback);
    
    console.log('listener count on qserver ' + eventName + ' ' + QuotesEmitter.listeners(eventName).length);
}

function live_sub(list, action)
{
    sutils.wssub(list, action)
    .then((responses) => { 
        console.log('sub successful, count: ' + responses.length);
    })
    .catch((error) => {
        console.log('one or more subs failed');
    });
}

function subscribe_vix(appid, mode, action)
{
    var instrument = {exchange: 'NSE', key: 'vix', stockCode: 'INDVIX', symbol: 'INDVIX', interval: '1second'};

    const request = {
        appid: appid,
        symbol: instrument.stockCode,
        instrument: instrument
    };
        
    sutils.wssub([request], action)
    .then((resp) => console.log(resp))
    .catch((error) => console.log(error));
}

export function wsemit(q)
{
    if(q.stock_code === 'INDVIX')
        QuotesEmitter.emit('live-vix', q);    
    else 
        QuotesEmitter.emit('live-quote', q);
}

export default {
    addListener,
    subscribe_vix,
    live_sub,
    getHistory,
    getHistoryAsync
};