import utils from '../../common/utils.mjs';

const us = new Map();

class Session
{
    appid;
    shared_with = new Map();    
    status = 'skeletal';
    constructor(appid, mode, stockCode)
    {
        this.appid = appid;
        this.mode = mode;
        this.stockCode = stockCode;

        us.set(this.appid, this);
        this.st = [
            {key: 'index', stockCode: stockCode, toStream: true, streamState: 'initialized'},
            {key: 'futures', stockCode: stockCode, toStream: true, streamState: 'initialized'},
            {key: 'occrnt', stockCode: stockCode, toStream: true, atm:0, n: 11},
            {key: 'ocnxt', stockCode: stockCode, toStream: false, atm:0, n: 11},
        ];
    }

    ini(p, callback) 
    {
        for(var i = 0; i < 4; i++)
        {
            this.st[i].exchange = i === 0 && p.exc === 'NFO' ? 'NSE' : p.exc;
            this.st[i].model = this.mode === 0 ? 'history' : 'live';
            this.st[i].symbol = i === 1 ? this.stockCode.concat(p.fExpiry).concat('FUT') : this.st[i].stockCode;
            this.st[i].toStream = i === 0 && p.exc === 'MCX' ? false : this.st[i].toStream;
            if(i != 0)
            {
                this.st[i].expiry = i === 1 ? p.fExpiry : i === 2 ? p.oExpiry : p.oExpiryNxt;
                this.st[i].n = (i === 2 || i === 3)? p.lscount + 2: 0;
            }
        }
        this.subsupdate = callback;
        this.status = 'initialized';
    }

    #oq(uq, ost)
    {
        if(ost.atm === undefined || ost.atm === 0)
            ost.atm = Math.round(uq.ltp/50) * 50;
        else
            ost.atm = ost.atm + Math.round((uq.ltp - ost.atm) / 50) * 50;
        
        var sks = utils.strikes(ost.atm, ost.n);

        for (var i = 0; i < sks.length; i++) 
        {
            var lst = utils.filter(this.st, {
                    stockCodes: [this.stockCode],
                    expiries: [ost.expiry],
                    strikes: [sks[i].strike],
                    rights: [sks[i].right]
                });

            if (lst.length === 0) 
            {
                this.st.push({
                    key: 'strikex',
                    toStream: true,
                    stockCode: ost.stockCode,
                    exchange: ost.exchange,
                    expiry: ost.expiry,
                    strike: sks[i].strike,
                    right: sks[i].right,
                    model: this.mode === 0 ? 'history' : 'live',
                    symbol: (ost.stockCode + ost.expiry +
                        sks[i].strike +
                        (sks[i].right === 'Call' ? 'CE' : 'PE').toUpperCase())
                });
            }
            else if(lst.length > 0)
            {
                lst[0].toStream = true;
                if(lst.length > 1)
                    console.error('Possible stream config duplication in session ' + lst[1].symbol);
            }

        }
        ost.streamState = 'ready to run';
        ost.strikes = sks;
        
        this.#ocqsub(ost.expiry, true);
    }

    #ocqsub(expiry, toStream)
    {
        const list = this.st.filter((s) => s.expiry === expiry 
                && s.toStream === toStream
                && s.key === 'strikex').map((s) => {
                    s.toStream = toStream;
                    return s;
                });
        this.subsupdate(list);
    }
    
    inqsub(p, callback)
    {    
        if(this.status === 'skeletal')
            this.ini(p, callback);
        if(this.status !== 'streaming')
            this.status = 'stream requested';

        return this.status !== 'streaming' ? utils.filter(this.st, {notinkeys: ['occrnt', 'ocnxt', 'strikex'], toStream: [true] }) : [];
    }
    
    unsuball(appid)
    {
        let list = []; 
        this.st.find((s) => s.key === 'futures').uq = undefined;
        if(this.mode === 0) {
            this.status = 'stopped';
            list = this.st.map((s) => {
                s.toStream = false;
                return s;
            });
        }
        else {
            this.shared_with.get(appid).m_subs = 'stopped';
        }
        return list;
    }

    option_chain(key, action)
    {
        var oc = this.st.find((e) => e.key === key);
        oc.toStream = oc.toStream === true ? false : true;
        this.#ocqsub(oc.expiry, oc.toStream);
        if(key === 'occrnt' && oc.toStream === false && this.st[3].toStream === false) {
            this.st[3].toStream = true;
            this.#ocqsub(this.st[3].expiry, true);
        }
    } 

    lastuq(uq)
    {
        var st = this.st.find((e) => e.key === 'futures');
        if(uq === undefined)
            return st.uq;

        var ost = utils.filter(this.st, { keys: ['occrnt', 'ocnxt'], toStream: [true] });
        for (var j = 0; j < ost.length; j++)
        {
            if (st.uq === undefined || (Math.abs(ost[j].atm  - uq.ltp)) > 50)
                this.#oq(uq, ost[j]);
        }
        this.status = 'streaming';
        st.uq = uq;
    }

    static sn(appid)
    {
        return us.get(appid);
    }

    static exit(appid, sn)
    {        
        if(sn.mode !== 0 && sn.shared_with.size > 1)
            sn.shared_with.delete(appid);
        else
            us.delete(sn.appid);
    }
}

export default Session;