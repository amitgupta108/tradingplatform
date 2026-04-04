const utils = require('../../common/utils');
const us = new Array(0);

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
            {key: 'index', toStream: true, streamState: 'initialized',},
            {key: 'futures', toStream: true, streamState: 'initialized',},
            {key: 'occrnt', toStream: true, atm: 25000},
            {key: 'ocnxt', toStream: false, atm: 25000},
            {key: 'vix', exchange: 'NSE', stockCode: 'INDVIX', toStream: true,
             symbol: 'INDVIX', streamState: 'initialized', },
        ];
        us.push(this);
    }

    ini(p, callback) 
    {
        for(var i = 0; i < this.st.length - 1; i++)
        {
            this.st[i].stockCode = this.st[i].stockCode === 'INDVIX' ? 'INDVIX' : p.stockCode; 
            this.st[i].exchange = p.exc === 'MCX' ? p.exc : (i != 0 && i != 4) ? 'NFO' : p.mode === 0 ? 'NSE' : 'NSE_INDEX';
            this.st[i].symbol = i === 1 || p.exc === 'MCX' ? p.stockCode.concat(p.fExpiry).concat('FUT') : p.stockCode;
            if(i != 0)
            {
                this.st[i].expiry = i === 1 ? p.fExpiry : i === 2 ? p.oExpiry : p.oExpiryNxt;
                this.st[i].n = i != 1? p.lscount : 0;
            }
        }
        this.subsupdate = callback;
        return this.inqsub();
    }

    #oq(uq, ost)
    {
        ost.atm = Math.round(uq.close / 50) * 50;
        var sks = utils.strikes(ost.atm, ost.n);

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

        this.subsupdate('subs', sublist);
    }
    
    inqsub() {
        var fst = utils.filter(this.st, {keys: ['index', 'futures', 'vix']});
        fst.forEach((e) => e.toStream = true);

        return fst;
    }
    
    unsuball() {
        this.st.forEach((e) => e.toStream = false);
        var st = this.st.find((e) => e.key === 'index');
        st.uq = undefined;
        return utils.filter(this.st, { notinkeys: ['occrnt', 'ocnxt']});
    }

    lastuq(uq)
    {
        var st = this.st.find((e) => e.key === 'index');
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
        var sn = us[idx];
        if(sn != undefined)
            if(sn.subsupdate != undefined)
                sn.subsupdate(uid, new Array(0), 'exit');
        us.splice(idx, 1);
    }
}

module.exports = Session;