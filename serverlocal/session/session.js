const utils = require('../../common/utils');
var us = new Array(0);

class Session
{
    uid;    
    mode;
    st;
    subsupdate;
    constructor(uid, mode)
    {
        this.uid = uid;
        this.mode = mode;
        this.st = [
            {key: 'index', toStream: true, mt: false, streamState: 'initialized',},
            {key: 'futures', toStream: true, mt: true, streamState: 'initialized',},
            {key: 'occrnt', toStream: true, mt: true, n: 0, lastUpdated: 0, atm: 25000},
            {key: 'ocnxt', toStream: false, mt: true, n: 0, lastUpdated: 0, atm: 25000},
            {key: 'vix', exchange: 'NSE', stockCode: 'INDVIX', toStream: false,
             symbol: 'INDVIX', mt: true, streamState: 'initialized', },
        ];
        us.push(this);
    }

    ini(p, callback) 
    {
        for(var i = 0; i < this.st.length - 1; i++)
        {
            this.st[i].stockCode = p.stockCode; 
            this.st[i].exchange = p.exc === 'MCX' ? p.exc : i != 0 ? 'NFO' : p.mode === 0 ? 'NSE' : 'NSE_INDEX';
            this.st[i].symbol = i === 1 || p.exc === 'MCX' ? p.stockCode.concat(p.fExpiry).concat('FUT') : p.stockCode;
            if(i != 0)
            {
                this.st[i].expiry = i === 1 ? p.fExpiry : i === 2 ? p.oExpiry : p.oExpiryNxt;
                this.st[i].n = i != 1? p.lscount : 0;
            }
            if(p.mdoe === 0 && st[i].key === 'vix')
                this.st[i].toStream = true;
        }
        this.subsupdate = callback;
    }

    #oq(uq, ost)
    {
        ost.atm = Math.round(uq.close / 50) * 50;
        var sks = utils.strikes(ost.atm, ost.n);

    /*    var curst = utils.filter(this.st, {
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
    */
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
        
        this.#ocqsub(ost.stockCode, ost.expiry);
    }


    #ocqsub(stockCode, expiry)
    {
        var fst = utils.filter(this.st, {keys: ['strikex'], stockCodes: [stockCode], expiries: [expiry]});
        var sublist = utils.filter(fst, {toStream: [true]});
        var unsublist = utils.filter(fst, {toStream: [false]});
    
        /* if(unsublist != 0)
            this.bserver.unsubscribe(this.uid, unsublist); */
        this.subsupdate(sublist);
    }
    
    inqsub() {
        var fst = utils.filter(this.st, {keys: ['index', 'futures', 'occrnt']});
        fst.forEach((e) => e.toStream = true);

        return utils.filter(this.st, {keys: ['index', 'futures']});
    }

    resume() {
        return utils.filter(this.st, {keys: ['index', 'futures', 'strikex']});
    }
    
    unsuball() {
        this.st.forEach((e) => e.toStream = false);
        return utils.filter(this.st, { notinkeys: ['occrnt', 'ocnxt', 'vix']});
        var st = utils.filter(this.st, {keys: ['index']})[0];
        st.uq = undefined;
    }

    lastuq(uq)
    {
        var st = utils.filter(this.st, {keys: ['index']})[0];
        if(uq === undefined)
            return st.uq;

        var ost = utils.filter(this.st, { keys: ['occrnt', 'ocnxt'], toStream: [true] });
        for (var j = 0; j < ost.length; j++)
        {
            if (st.uq === undefined || (Math.abs(ost[j].atm  - uq.close))  > 60)
                this.#oq(uq, ost[j]);
        }
        st.uq = uq;
    }

    static usn(uid){
        return us.find((e) => e.uid === uid);
    }

    static destroy(uid)
    {
        var idx = us.findIndex((e) => e.uid === uid);
        us.splice(idx, 1);
    }
}

module.exports = Session;