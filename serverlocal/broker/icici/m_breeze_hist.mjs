import { BreezeMarketData } from './m_breeze.mjs';

export class BreezeMarketDataHist extends BreezeMarketData {

    clocks = new Map();
    qs_store = new Map();
    subs_reqs = new Map();

    streamers = [
        { key: '1x', speed: 1, qsid: 0, state: 'stopped' },
        { key: '2x', speed: 2, qsid: 0, state: 'stopped' },
        { key: '3x', speed: 3, qsid: 0, state: 'stopped' },
        { key: '5x', speed: 5, qsid: 0, state: 'stopped' },
        { key: '10x', speed: 10, qsid: 0, state: 'stopped' },
    ];

    constructor(name) {
        super(name);
    }

    onAuthData(authdata) {
        this.authData = authdata;
        this.adapter.initiateConnect(this.authData, false);
    }

    startStreamer(stmrkey) {
        const stmr = this.streamers.find((s) => s.key === stmrkey);

        if (stmr.state === 'stopped') {
            stmr.qsid = setInterval(() => {

                this.dothings(stmrkey);
                this.runclient_clocks(stmrkey);
                if (Array.from(this.clocks.values()).filter(c => c.key === stmrkey).length === 0)
                    this.stopStreamer(stmrkey);
            }, 980 / stmr.speed);
            stmr.state = 'started';
        }
    }

    stopStreamer(stmrkey) {
        var stmr = this.streamers.find((x) => x.key === stmrkey);

        if (stmr?.state != 'stopped') {
            clearInterval(stmr.qsid);
            stmr.state = 'stopped';
            stmr.qsid = 0;
        }
    }

    dothings(stmrkey) {
        try {
            for (var c of this.clocks.values()) {
                if (c.key === stmrkey && c.lastaction !== 'pause') {
                    const reqs = this.subs_reqs.get(c.appid) || [];
                    for (var req of reqs) {
                        this.q(req, c.currentTime);
                    }
                }
            }
        } catch (error) {
            this.error('Error in emitting quotes,for appid - symbol: ' + c.appid + ' ' + req.symbol + ' ' + error.stack);
            this.subs_reqs.delete(c.appid);
        }
    }

    runclient_clocks(stmrkey) {
        for (const c of this.clocks.values()) {
            if (c.key === stmrkey) {
                if (c.state === 'start initiated')
                    c.state = 'started';

                if (!(c.state === 'paused' || c.state === 'stopped'))
                    c.currentTime = c.currentTime + 1000;
            }
        }
    }

    addToClientStore(appid, instrument) {
        const qArray = this.qs_store.get(appid);
        const c = this.clocks.get(appid);

        let st = qArray.find((q) => q.symbol === instrument.symbol);
        if (st === undefined) {
            let st = {
                appid: appid, symbol: instrument.symbol, quotes: [],
                trimIndex: -1, state: 'initialized', lastUpdated: c.currentTime
            };

            qArray.push(st);

            st.state = 'load requested';
            this.qw(st, instrument, c.currentTime);
        }
    }

    q(request, time) {
        const { appid, instrument } = request;
        const qArray = this.qs_store.get(appid);
        const st = qArray.find((q) => q.symbol === instrument.symbol);

        try {
            let idx = -1;
            if (st?.quotes !== undefined && st.quotes.length > 0) {
                if (st.trimIndex === undefined || st.trimIndex <= 0) {
                    idx = st.quotes.findIndex((q) => q.ltt === time);
                    if (idx >= 0)
                        st.trimIndex = idx + 1;
                }
                else if (st.trimIndex > 0 && st.quotes[st.trimIndex]?.ltt === time) {
                    idx = st.trimIndex++;
                }

                if (idx >= 0 && idx < st.quotes.length)
                    this.onQuotes(st.quotes[idx], appid);
            }
        } catch (e) {
            this.unsubscribeScrips(appid, [request]);
            this.error("Error in q: " + st.symbol + ' ' + e.stack);
        }

        const reloadThreshold = 80;
        if ((st?.quotes === undefined || st.quotes.length - idx < reloadThreshold) && st.state != 'load requested') {
            st.quotes.splice(0, idx);
            st.trimIndex = -1;
            st.state = 'load requested';
            setImmediate(() => {
                this.log('load requested symbol: ' + st.symbol + ' ' + [st.quotes?.length, idx, st.trimIndex]);
                this.qw(st, instrument, st.quotes[st.quotes.length - 1]?.ltt + 1000 || time + reloadThreshold * 1000);
            });
        }
    }

    qw(st, instrument, time) {
        this.loadHistoricalData(st, instrument, time)
            .then((st) => {
                if (!st.quotes || st.quotes.length === 0)
                    this.log('no historical records fetched');
            }).catch((reason) => {
                st.state = 'load failed';
                this.log('load failed for: ' + st?.symbol + ' ' + reason);
            });
    }

    processResults(st, quotes, symbol) {
        let index = 50;
        index = Math.min(quotes.length, index);
        for (var i = 0; i < index; i++) {
            st.quotes.push(this.trim(quotes[i], symbol));
        }
        setImmediate(() => {
            for (var i = index; i < quotes.length; i++) {
                st.quotes.push(this.trim(quotes[i], symbol));
            }
        });
    }

    trim(q, symbol) {
        const { exchange_code: exchange, stock_code: stockCode, close: ltp, datetime: ltt, ...rest } = q;
        const qt = { exchange, stockCode, ltp, ltt };
        qt.ltt = Date.parse(qt.ltt);
        qt.symbol = symbol;

        return qt;
    }

    standardize(q) {
        return { ...q, ...this.symbol_cache.get(q.symbol) };
    }

    clear(appid) {
        this.clocks.delete(appid);
        this.qs_store.delete(appid);
        this.subs_reqs.delete(appid);

        this.log('Drop user ' + appid);
        return { status: 'success' };
    }

    start_sim(appid, requests) {
        if (requests?.length > 0) {
            this.subscribeScrips(appid, requests);
            const c = this.clocks.get(appid);
            c.lastaction = 'start';
            this.startStreamer(c.key);
            c.state = 'start initiated';
        }
    }

    subscribeScrips(appid, requests) {
        const exReqs = this.subs_reqs.get(appid);

        requests.forEach((request) => {
            const idx = exReqs.findIndex((s) => s.symbol === request.symbol);

            if (idx === -1)
                exReqs.push(request);

            this.addToClientStore(appid, request.instrument);
        });
    }

    unsubscribeScrips(appid, requests) {
        const i_reqs = this.subs_reqs.get(appid);
        requests.forEach((request) => {

            var idx = i_reqs.findIndex((s) => s.symbol === request.symbol);

            if (idx !== -1)
                i_reqs.splice(idx, 1);
        });
    }


    async loadHistoricalData(st, instrument, sTime) {
        var resp = await this.adapter.getHistory(instrument, sTime, sTime + ((1000) * 1000), '1second')
            .catch((error) => {
                this.error("loadHistoricalDatav2 failed, ", error.message);
                return Promise.reject(error);
            });

        let quotes = resp.Success;
        if (quotes?.length > 0) {
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
    /*---------------------------------------------------------External APIs------------------------------------------------------------------------*/

    getHistory(appid, request) {
        const endtime = this.clocks.get(appid) !== undefined ? this.clocks.get(appid).currentTime : request.endTime;
        return this.adapter.getHistory(request, request.startTime, endtime, request.interval);
    }

    clientConfigure(appid, simStartTime, speed = '1x') {
        if (simStartTime) {
            this.subs_reqs.set(appid, new Array(0));
            if (this.clocks.get(appid) === undefined) {
                this.qs_store.set(appid, new Array(0));
                this.clocks.set(appid, { appid: appid, sTime: simStartTime, currentTime: simStartTime, key: speed, lastaction: 'none' });
            }
        }
        else
            throw error(`[${this.name}] invalid simstart time ` + simStartTime);
    }

    changeSpeed(appid, stmrkey) {
        var clock = this.clocks.get(appid);
        clock.key = stmrkey;

        var stmr = this.streamers.find((s) => s.key === stmrkey);
        var exReq = this.subs_reqs.get(appid) || [];
        if (stmr.state === 'stopped' && exReq.length > 0)
            this.startStreamer(stmrkey);
    }

    stream(appid, action) {
        const c = this.clocks.get(appid);
        c.lastaction = action;
        c.state = action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'unknown';
        return c.state;
    }

    subscribe(appid, list, action) {
        const requests = this.buildRequests(appid, list);

        if (action === 'subs')
            this.subscribeScrips(appid, requests);
        else if (action === 'start')
            this.start_sim(appid, requests);
        else
            this.unsubscribeScrips(appid, requests);
    }

    subscribeIndices(appid, stockCode) {
        const requests = this.indicesRequest(appid, stockCode);
        this.subscribeScrips(appid, requests);
    }

    exit(appid) {
        super.exit(appid);
        return this.clear(appid);
    }
}