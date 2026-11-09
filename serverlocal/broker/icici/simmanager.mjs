/*import { ConfigService } from '../../service/config/configservice.mjs';
import { UserService } from '../../service/system/service.mjs';

export class SimulatorHistory extends UserService
{    
    clocks = new Map();
    qs_store = new Map();
    subs_reqs = new Map();

    streamers = [
        {key: '1x', speed: 1, qsid: 0, state: 'stopped'},
        {key: '2x', speed: 2, qsid: 0, state: 'stopped'},
        {key: '3x', speed: 3, qsid: 0, state: 'stopped'},  
        {key: '5x', speed: 5, qsid: 0, state: 'stopped'},
        {key: '10x', speed: 10, qsid: 0, state: 'stopped'},
    ];  

    constructor(name) 
    {
        super(name);
    }

    init()
    {
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
        this.es.addListener('icici_auth', (authdata) => {
            this.onAuthData(authdata);
        });

        this.af = ConfigService.getServiceByName('ADAPTERFACTORY');
        this.adapter = this.af.getAdapter('BREEZEADAPTER');
        this.adapter.addListener('hist-quote', (arg) => this.onQuotes(arg));
    }

    onAuthData(authdata) {
        this.authData = authdata;
        this.adapter.initiateConnect(this.authData);
        this.initialized = true;
    }

    startStreamer(stmrkey)
    {
        const stmr = this.streamers.find((s) => s.key === stmrkey);
        
        if(stmr.state === 'stopped') 
        {
            stmr.qsid = setInterval(() => {
            
                this.dothings(stmrkey);
                this.runclient_clocks(stmrkey);
                if(Array.from(this.clocks.values()).filter(c => c.key === stmrkey).length === 0) 
                    this.stopStreamer(stmrkey);
            }, 980 / stmr.speed);
            stmr.state = 'started';   
        }
    }

    stopStreamer(stmrkey)
    {
        var stmr = this.streamers.find((x) => x.key === stmrkey);
        
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
            for (const c of this.clocks.values()) {
                if (c.key === stmrkey && c.lastaction !== 'pause') {
                    var reqs = this.subs_reqs.get(c.appid) || [];
                    reqs.forEach((req) => {
                        this.q(req.appid, req.instrument, c.currentTime);
                    });
                }
            }
        } catch (error){
            this.log('Error for appid, unsubscribe all: ' + error.appid + ' ' + error.stack);
            this.subs_reqs.delete(error.appid);
        }
    }

    runclient_clocks(stmrkey) 
    {
        for (const c of this.clocks.values()) {
            if (c.key === stmrkey) {
                if(c.state === 'start initiated')
                    c.state = 'started';

                if(!(c.state === 'paused' || c.state === 'stopped'))
                    c.currentTime = c.currentTime + 1000;
            }
        }
    }

    addToClientStore(appid, instrument)
    {
        const qArray = this.qs_store.get(appid);
        const c = this.clocks.get(appid);

        let st = qArray.find((q) => q.symbol === instrument.symbol);
        if (st === undefined) {
            let st = {
                appid: appid, symbol: instrument.symbol, quotes: [],
                trimIndex: -1, state: 'initialized', lastUpdated: c.currentTime};

            qArray.push(st);

            st.state = 'load requested';
            this.qw(st, instrument, c.currentTime);
        }
    }

    q(appid, instrument, time)
    {
        var qArray = this.qs_store.get(appid);
        var st = qArray.find((q) => q.symbol === instrument.symbol);

        let idx = -1;
        if (st?.quotes !== undefined && st.quotes.length > 0) {
            if (st.trimIndex === undefined || st.trimIndex <= 0) {
                idx = st.ltt.indexOf(time);
                if (idx >= 0)
                    st.trimIndex = idx + 1;
            }
            else if (st.trimIndex > 0 && st.quotes[st.trimIndex].ltt === time) {
                idx = st.trimIndex++;
            }

            if (idx >= 0 && idx < st.quotes.length)
                this.es.emit('hist-quote', st.quotes[idx], appid);
        }
        
        if ((st?.quotes === undefined || st.quotes.length - idx < 80) && st.state != 'load requested')
        {
            setImmediate(() => {
                this.log('load requested symbol: ' + st.symbol + ' with length: ' + st.quotes?.length + ' at index: ' + idx);
                st.quotes.splice(0, st.trimIndex);
                st.trimIndex = 0;
                st.state = 'load requested';
                this.qw(st, instrument, time);
            });
        }
    }

    qw(st, instrument, time) {
        this.getHistoricalData(st, instrument, time)
        .then((st) => {
            if(!st.quotes || st.quotes.length === 0)
                this.log('no historical records fetched');
        }).catch((reason) => {
            st.state = 'load failed';
            this.error('Rejection for appid: ' + st.appid + ' ' + reason);
        });
    }

    async getHistoricalData(st, instrument, sTime) 
    {
        var resp = await this.adapter.getHistory(instrument, sTime, sTime + ((1000) * 1000), '1second')
        .catch((error) => {
            this.error("getHistoricalDatav2 failed, ", error.message);
            return Promise.reject(error);
        });

        let quotes = resp.Success;
        if (quotes?.length > 0) {
            st.trimIndex = 0;
            st.state = 'ready to stream';
            st.lastUpdated = sTime;
           this.processResults(st, quotes, instrument.symbol);
        }
        else {
            st.state = 'load failed';
            this.log('No historical records fetched for symbol: ' + instrument.symbol);
        }
        return st;
    }

     processResults(st, quotes, symbol) 
     {
        let index = 50;
        index = Math.min(quotes.length, index);
        for(var i = 0; i < index; i++){
            st.quotes.push(this.standardize(quotes[i], symbol));
        }       
        setImmediate(() => {
            for (var i = index; i < quotes.length; i++) {
                st.quotes.push(this.standardize(quotes[i], symbol));
            }
        });
    }

    standardize(q, symbol)
    {
        const {exchange_code: exchange, stock_code: stockCode, close: ltp, datetime: ltt, ...rest} = q;
        const qt = {exchange, stockCode, ltp, ltt};
        qt.ltt = Date.parse(qt.ltt);
        qt.symbol = symbol;

        return qt;
    }
    

//---------------------------------------------------------External APIs------------------------------------------------------------------------

clientInit(appid, simStartTime, speed = '1x')
{
    this.subs_reqs.set(appid, new Array(0));
    if (this.clocks.get(appid) === undefined) {
        this.qs_store.set(appid, new Array(0));
        this.clocks.set(appid, { appid: appid, sTime: simStartTime, currentTime: simStartTime, key: speed, lastaction: 'none' });
    }
}

start_sim(appid, requests)
{
    if (requests?.length > 0) {
        this.subscribe(appid, requests);
        const c = this.clocks.get(appid);
        c.lastaction = 'start';
        this.startStreamer(c.key);
        c.state = 'start initiated';
    }
}

subscribe(appid, requests)
{
    const exReqs = this.subs_reqs.get(appid);

    requests.forEach((request) => {
        const idx = exReqs.findIndex((s) => s.symbol === request.symbol);

        if (idx === -1)
            exReqs.push(request);

        this.addToClientStore(appid, request.instrument);
    });
}

unsubscribe(appid, requests) {
    const i_reqs = this.subs_reqs.get(appid);
    requests.forEach((request) => {

        var idx = i_reqs.findIndex((s) => s.symbol === request.symbol);

        if (idx !== -1)
            i_reqs.splice(idx, 1);
    });
}

changeSpeed(appid, stmrkey) {
    var clock = this.clocks.get(appid);
    clock.key = stmrkey;

    var stmr = this.streamers.find((s) => s.key === stmrkey);
    var exReq = this.subs_reqs.get(appid) || [];
    if (stmr.state === 'stopped' && exReq.length > 0)
        this.startStreamer(stmrkey);
}

stream(appid, action)
{
    const c = this.clocks.get(appid);
    c.lastaction = action;
    c.state = action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'unknown';
    return c.state;
}

subscribe_vix(appid, mode, action) {
    var instrument = { exchange: 'NSE', key: 'vix', stockCode: 'INDVIX', symbol: 'INDVIX', interval: '1second' };

    const request = {
        appid: appid,
        symbol: instrument.stockCode,
        instrument: instrument
    };

    if (action === 'subs')
        this.subscribe(appid, [request]);
    else
        this.unsubscribe(appid, [request]);
}

clear(appid) {
    this.clocks.delete(appid);
    this.qs_store.delete(appid);
    this.subs_reqs.delete(appid);

    this.log('Drop user ' + appid);
    return { status: 'success' };
}
}*/