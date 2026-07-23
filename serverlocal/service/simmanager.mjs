import {simstate} from '../session/simstate.mjs';
import qserver from '../../srvr/qserver.mjs';
import { EventService } from './eventservice.mjs';

class SimManager
{
    constructor() {
        this.simdata = simstate;
    }

    clientInit(appid, simStartTime, speed = '1x') {
        this.simdata.subs_reqs.set(appid, new Array(0));
        if(this.simdata.clocks.get(appid) === undefined) {
            this.simdata.qs_store.set(appid, new Array(0));
            this.simdata.clocks.set(appid, {appid: appid, sTime: simStartTime, currentTime: simStartTime, key: speed, lastaction: 'none'});
        }
    }

     startStreamer(stmrkey){
        const stmr = this.simdata.streamers.find((s) => s.key === stmrkey);
        
        if(stmr.state === 'stopped') 
        {
            stmr.qsid = setInterval(() => {
            
                this.dothings(stmrkey);
                this.runclient_clocks(stmrkey);
                if(Array.from(this.simdata.clocks.values()).filter(c => c.key === stmrkey).length === 0) 
                    this.stopStreamer(stmrkey);
            }, 980 / stmr.speed);
            stmr.state = 'started';   
        }
    }

     stopStreamer(stmrkey){
        var stmr = this.simdata.streamers.find((x) => x.key === stmrkey);
        
        if(stmr?.state != 'stopped') {
            clearInterval(stmr.qsid);
            stmr.state = 'stopped';
            stmr.qsid = 0;
        }
    }

     dothings(stmrkey) 
    {
        try
        {
            for (const c of this.simdata.clocks.values()) {
                if (c.key === stmrkey && c.lastaction !== 'pause') {
                    var reqs = this.simdata.subs_reqs.get(c.appid) || [];
                    reqs.forEach((req) => {
                        this.q(req.appid, req.instrument, c.currentTime);
                    });
                }
            }
        } catch (error){
            console.log('Error for appid, unsubscribe all: ' + error.appid + ' ' + error.stack);
            this.simdata.subs_reqs.delete(error.appid);
        }
    }

     runclient_clocks(stmrkey) 
    {
        for (const c of this.simdata.clocks.values()) {
            if (c.key === stmrkey) {
                if(c.state === 'start initiated')
                    c.state = 'started';

                if(!(c.state === 'paused' || c.state === 'stopped'))
                    c.currentTime = c.currentTime + 1000;
            }
        }
    }

     start_sim(appid, requests) {

        if(requests?.length > 0)
        {
            this.subscribe(appid, requests);
            const c = this.simdata.clocks.get(appid);
            c.lastaction = 'start';
            this.startStreamer(c.key);
            c.state = 'start initiated';
        }
    }

     subscribe(appid, requests) {
        
        const exReqs = this.simdata.subs_reqs.get(appid);

        requests.forEach((request) => {
            const idx = exReqs.findIndex((s) => s.symbol === request.symbol);
            
            if(idx === -1)
                exReqs.push(request);
                
            this.addToClientStore(appid, request.instrument);
        });
    }

     addToClientStore(appid, instrument)
    {
        const qArray = this.simdata.qs_store.get(appid);
        const c = this.simdata.clocks.get(appid);

        let st = qArray.find((q) => q.symbol === instrument.symbol);
        if (st === undefined) {
            let st = {
                appid: appid, symbol: instrument.symbol, quotes: undefined, indexA: undefined,
                trimIndex: -1, state: 'initialized', lastUpdated: c.currentTime};

            qArray.push(st);

            st.state = 'load requested';
            this.qw(st, instrument, c.currentTime);
        }
    }

     unsubscribe(appid, requests) {
        const i_reqs = this.simdata.subs_reqs.get(appid);
        requests.forEach((request) => {
            
            var idx = i_reqs.findIndex((s) => s.symbol === request.symbol);
        
            if(idx !== -1)
                i_reqs.splice(idx, 1);
        });
    }

     q(appid, instrument, time)
    {
        var qArray = this.simdata.qs_store.get(appid);
        var st = qArray.find((q) => q.symbol === instrument.symbol);

        if (st?.quotes !== undefined) {
            var idx = -1;
            if (idx < 0) {
                idx = st.indexA.indexOf(time);
                if (idx >= 0)
                    st.trimIndex = idx + 1;
            }
            else if (st.trimIndex > 0 && st.quotes[st.trimIndex].ltt === time) {
                idx = st.trimIndex++;
            }

            if (idx >= 0)
            this.emit(st.quotes[idx], appid);
        }
        
        if ((st.quotes === undefined || st.quotes.length - idx < 50) && st.state != 'load requested')
        {
            setImmediate(() => {
                st.state = 'load requested';
                this.qw(st, instrument, time);
            });
        }
    }

     qw(st, instrument, time) {
        var qs = this.getHistoricalData(st, instrument, time);

        qs.catch((reason) => {
            st.state = 'load failed';
            console.log('Rejection for appid: ' + st.appid + ' ' + reason);
        });
    }

     clear(appid) {
        this.simdata.clocks.delete(appid);
        this.simdata.qs_store.delete(appid);
        this.simdata.subs_reqs.delete(appid);

        console.log('Drop user ' + appid);
        return { status: 'success' };
    }

     changeSpeed(appid, stmrkey) {
        var clock = this.simdata.clocks.get(appid);
        clock.key = stmrkey;

        var stmr = this.simdata.streamers.find((s) => s.key === stmrkey);
        var exReq = this.simdata.subs_reqs.get(appid) || [];
        if (stmr.state === 'stopped' && exReq.length > 0)
            this.startStreamer(stmrkey);
    }

     pause(appid, action) {
        const c = this.simdata.clocks.get(appid);
        c.lastaction = action;
        c.state = action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'unknown';
        return c.state;
    }

    async  getHistoricalData(st, instrument, sTime) 
    {
        var resp = await qserver.getHistoryAsync(instrument, sTime, sTime + ((16 * 60) * 1000), '1second')
            .catch((error) => {
                console.warn("getHistoricalDatav2 failed, ", error.message);
                return Promise.reject(error);
            });

        var quotes = resp.Success;
        if (Array.isArray(quotes)) {

            st.quotes = quotes;
            st.trimIndex = 0;
            st.state = 'ready to stream';
            st.lastUpdated = sTime;
            st.indexA = this.processResults(st.quotes, 50);
        }
        return st;
    }

     processResults(quotes, index) {
        index = Math.max(Math.round(quotes.length * 0.10), index);
        const frontend = quotes.slice(0, index);
        const backend = quotes.slice(index);
        const indexA = new Array();
        frontend.forEach((q) => {
            const ltt = Date.parse(q.datetime);
            q.ltt = ltt;
            indexA.push(ltt);
        });
        setImmediate(() => {
            backend.forEach((q) => {
                const ltt = Date.parse(q.datetime);
                q.ltt = ltt;
                indexA.push(ltt);
            });
        });
        return indexA;
    }

     getHistory(appid, r)
    {
        const clock = st_q.clocks.get(appid);
        r.endTime = clock !== undefined ? clock.currentTime : r.endTime;

        return qserver.getHistory(appid, r)
        .then((response) => {
            if (response?.Error === null)
                EventService.emit('history', response.Success, r.key, appid); 
            else
                EventService.emit('history', [response.Error], r.key, appid);
        });
    }

     subscribe_vix(appid, mode, action) {
        var instrument = { exchange: 'NSE', key: 'vix', stockCode: 'INDVIX', symbol: 'INDVIX', interval: '1second' };

        const request = {
            appid: appid,
            symbol: instrument.stockCode,
            instrument: instrument
        };

        if (mode.startsWith('HISTORY')) {
            if (action === 'subs')
                this.subscribe(appid, [request]);
            else
                this.unsubscribe(appid, [request]);
        }
    }

     emit(q, appid) {
        if (q.stock_code === 'INDVIX')
            EventService.emit('hist-vix', q, appid);
        else
            EventService.emit('hist-quote', q, appid);
    }
}

export const simmanager = new SimManager();