const utils = require('../../common/utils');
const iBreeze = require('../broker/breeze');
const iKNeo = require('../broker/kotakneo');

var us = new Array(0);

class Session
{
    uid;    
    s;
    st;
    mode;
    cb;
    cg;
    bserver;
    constructor(uid, s, cg)
    {
        this.uid = uid;
        this.s = s;
        this.cg = cg;
        us.push(this);
        this.st = [
            {key: 'index', toStream: true, mt: false, streamState: 'initialized',},
            {key: 'futures', toStream: true, mt: true, streamState: 'initialized',},
            {key: 'occrnt', toStream: true, mt: true, n: 0, lastUpdated: 0, atm: 25000},
            {key: 'ocnxt', toStream: false, mt: true, n: 0, lastUpdated: 0, atm: 25000},
            {key: 'vix', exchange: 'NSE', stockCode: 'INDVIX', toStream: false,
             symbol: 'INDVIX', mt: true, streamState: 'initialized', },
        ];
    
    }

    ini(p) 
    {
        this.mode = p.mode;
        this.bserver = p.mode === 0 ? iBreeze : iKNeo;
        this.bserver.connect(this.emitQuotes);

        for(var i = 0; i < this.st.length - 1; i++)
        {
            this.st[i].stockCode = p.stockCode; 
            this.st[i].exchange = p.exc === 'MCX' ? p.exc : i != 0 ? 'NFO' : 'NSE';
            this.st[i].symbol = i === 1 || p.exc === 'MCX' ? p.stockCode.concat(p.fExpiry).concat('FUT') : p.stockCode;
            if(i != 0)
            {
                this.st[i].expiry = i === 1 ? p.fExpiry : i === 2 ? p.oExpiry : p.oExpiryNxt;
                this.st[i].n = i != 1? p.lscount : 0;
            }
        }
    }

    #oq(uq, ost)
    {
        ost.atm = Math.round(uq.close / 50) * 50;
        var sks = utils.strikes(ost.atm, ost.n);

        var curst = utils.filter(this.st, {
            stockCodes: [ost.stockCode],
            expiries: [ost.expiry],
            keys: ['strikex']
        });
        
        for (var i = 0; i < curst.length; i++) 
        {
            var lst = utils.filter(sks, {
                strikes: [curst.strike],
                rights: [curst.right]});
        
            if(lst === undefined || lst.length === 0)
                curst[i].toStream = false;
        }

        for (var i = 0; i < sks.length; i++) 
        {
            var lst = utils.filter(this.st, {
                    stockCodes: [ost.stockCode],
                    expiries: [ost.expiry],
                    strikes: [sks[i].strike],
                    rights: [sks[i].right]
                })[0];

            if (lst != undefined) 
                lst.toStream = true;
            else
                this.st.push({
                    key: 'strikex',
                    toStream: true,
                    stockCode: ost.stockCode,
                    exchange: ost.exchange,
                    expiry: ost.expiry,
                    strike: sks[i].strike,
                    right: sks[i].right,
                    symbol: (ost.stockCode + ost.expiry +
                        sks[i].strike +
                        (sks[i].right === 'Call' ? 'CE' : 'PE').toUpperCase())
                });
        }
        ost.streamState = 'ready to run';
        ost.strikes = sks;
        
        ocqsub(this.st, ost.stockCode, ost.expiry, this.cb);
    }

    order(p)
    {
        return this.bserver.order(p);
    }

    ocqsub(st, stockCode, expiry, callback)
    {
        var fst = utils.filter(st, {keys: ['strikex'], stockCodes: [stockCode], expiries: [expiry]});
        var sublist = utils.filter(fst, {toStream: [true]});
        var unsublist = utils.filter(fst, {toStream: [false]});
    
        this.bserver.subscribe_ltp(sublist, callback);
        if(unsublist != 0)
            this.bserver.unsubscribe_ltp(unsublist);
    }
    
    inqsub() {
        var fst = utils.filter(this.st, {keys: ['index', 'futures']});
        this.bserver.subscribe(fst, this.emitQuotes);
    }
    
    unsuball() {
        var fst = utils.filter(this.st, { notinkeys: ['occrnt', 'ocnxt', 'vix']});
        this.bserver.unsubscribe(fst);
    }

    lastuq(uq, lt)
    {
        var st = utils.filter(this.st, {keys: ['index']})[0];
        if(uq === undefined)
            return st.uq;

        var ost = utils.filter(this.st, { keys: ['occrnt', 'ocnext'], toStream: [true] });
        for (var j = 0; j < ost.length; j++)
        {
            if (st.uq === undefined || (Math.abs(ost[j].atm  - uq.close))  > 60)
                this.#oq(uq, ost[j], lt);
        }
        st.uq = uq;
    }

    emitQuotes(q)
    {
        try {
            q = this.bserver.standardizeq(q);
    
            var key = 'strikex';
            if (q.exchange === 'NSE' || (q.exchange === 'MCX' && q.symbol.endsWith('FUT')))
            {
                sn.lastuq(q, lt);
                key = 'index';
            }
            else if (q.exchange === 'NFO' && q.symbol.endsWith('FUT'))
                key = 'futures';
            else if (q.symbol.endsWith('CE') || q.symbol.endsWith('PE'))
                utils.addIVNDelta(q, sn.lastuq(), lt);
    
            this.s.emit(key, q);
        } catch(error){
            console.log(error);
        }
    }

    static sn(uid)
    {
        return us.find((e) => e.uid === uid);
    }

    static destroy(uid)
    {
        var idx = us.findIndex((e) => e.uid === uid);
        us.splice(idx, 1);
    }
}

module.exports = Session;