/*import EventEmitter from 'node:events';
import { BreezeConnect } from 'breezeconnect';
import { BreezeClient } from './breezeclient.mjs';
import { ConfigService } from '../serverlocal/service/config/configservice.mjs';

class QuoteServer extends EventEmitter {

    constructor(name){
        super();
        this.name = name;
        
        const es = ConfigService.getServiceByName('EVENTSERVICE');
        
        es.addListener('icici_auth', (authdata) => {
            const breeze = new BreezeConnect({ "appKey": process.env.breeze_appKey });
            breeze.generateSession(authdata.apiSecret, authdata.authcode)
            .then((resp) => {
                breeze.wsConnect();
                breeze.onTicks = this.wsemit;
                console.log('breeze session started ');
                
                breeze.socket.on('connect', () => {
                    console.log('breeze socket connected');
                });

                breeze.socket.on('connect_error', () => {
                    console.log('breeze socket connection error');
                });

                breeze.socket.on('disconnect', () => {
                    console.log('breeze socket disconnected');
                });
                this.breezeadpater = new BreezeClient(breeze);
            }).catch((error) => {
                console.error('breeze error ' + error);
            });
        });
    }

    getHistoryAsync(instrument, startTime, endTime, interval)
    {
        return this.breezeadpater.getHistory(instrument, startTime, endTime, interval);
    }

    getHistory(appid, r) 
    {
        return this.breezeadpater.getHistory(r, r.startTime, r.endTime, r.interval);
    }

    addListener(eventName, callback)
    {
        const list = super.listeners(eventName);
        if(list.length === 0)
            super.addListener(eventName, callback);
        
        console.log('listener count on qserver ' + eventName + ' ' + this.listeners(eventName).length);
    }

    subscribe(appid, list)
    {
        this.live_sub(list, 'subs');
    }

    unsubscribe(appid, list) {
        this.live_sub(list, 'unsub');
    }

    live_sub(list, action)
    {
        this.breezeadpater.wssub(list, action)
        .then((responses) => {
            console.log('sub successful, count: ' + responses.length);
        })
        .catch((error) => {
            console.log('one or more subs failed');
        });
    }

    subscribe_vix(appid, mode, action)
    {
        var instrument = {exchange: 'NSE', key: 'vix', stockCode: 'INDVIX', symbol: 'INDVIX', interval: '1second'};

        const request = {
            appid: appid,
            symbol: instrument.stockCode,
            instrument: instrument
        };
            
        return this.breezeadpater.wssub([request], action);
    }

    wsemit(q)
    {
        if (q.symbol?.includes('VIX') || q.stock_code?.includes('VIX'))
            super.emit('vix', q);
        else 
            super.emit('live-quote', q);
    }
}

//export const qserver = new QuoteServer('BreezeQuotes');
*/