import utils from '../../common/utils.mjs';

const us = new Map();

class Session
{
    appid;
    shared_with = new Map();    
    status = 'skeletal';
    constructor(appid, mode, stockCode)
    {
        const i_appid = mode === 0 ? appid : stockCode + mode;

        if(mode === 0 && this.shared_with.size !== 0)
            throw error('Invalid session creation attempted');
        
        this.appid = i_appid;

        this.shared_with.set(appid, this);
        this.mode = mode;
        this.stockCode = stockCode;

        us.set(i_appid, this);
        this.st = [
            {key: 'index', stockCode: stockCode, toStream: true, streamState: 'initialized'},
            {key: 'futures', stockCode: stockCode, toStream: true, streamState: 'initialized'},
            {key: 'occrnt', stockCode: stockCode, toStream: true, atm:0},
            {key: 'ocnxt', stockCode: stockCode, toStream: false, atm:0},
            {key: 'vix', stockCode: 'INDVIX', toStream: true, streamState: 'initialized', source:'icici'},
        ];
    }

    ini(p, callback) 
    {
        for(var i = 0; i < 5; i++)
        {
            this.st[i].exchange = (i === 0 || i === 4) && p.exc === 'NFO' ? 'NSE' : p.exc;
            this.st[i].model = this.mode === 0 ? 'history' : 'live';
            this.st[i].symbol = i === 1 ? this.stockCode.concat(p.fExpiry).concat('FUT') : this.st[i].stockCode;
            this.st[i].toStream = (i === 0 || i === 4) && p.exc === 'MCX' ? false : this.st[i].toStream;
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
            ost.atm = Math.round(uq.close/50) * 50;
        else
            ost.atm = ost.atm + Math.round((uq.close - ost.atm) / 50) * 50;
        
        var sks = utils.strikes(ost.atm, ost.n);

        for (var i = 0; i < sks.length; i++) 
        {
            var lst = utils.filter(this.st, {
                    stockCodes: [ost.stockCode],
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
        
        this.#ocqsub(ost.stockCode, ost.expiry);
    }

    #ocqsub(stockCode, expiry)
    {
        var fst = utils.filter(this.st, {keys: ['strikex'], stockCodes: [stockCode], expiries: [expiry]});
        var sublist = utils.filter(fst, {toStream: [true]});
        this.status = 'request completed';
        this.subsupdate(sublist);
    }
    
    inqsub(p, callback) {
        if(['skeletal', 'stopped'].includes(this.status))
            this.ini(p, callback);

        this.status = 'stream requested';
        
        return utils.filter(this.st, {keys: ['index', 'futures', 'vix'], toStream: [true]});
    }
    
    unsuball(appid)
    {
        
        this.shared_with.delete(appid);
        if(this.shared_with.size > 1)
            return new Array();
        else
        {
            this.st.forEach((e) => e.toStream = false);
            var ist = this.st.find((e) => e.key === 'index');
            ist.uq = undefined;
            this.status = 'stopped';
            return utils.filter(this.st, { notinkeys: ['occrnt', 'ocnxt']});
        }
    }

    option_chain(key, action)
    {
        var oc_state = this.st.find((e) => e.key === key).toStream;
        oc_state = oc_state === true ? false : true;
    } 

    lastuq(uq)
    {
        var st = this.st.find((e) => e.key === 'index');
        if(uq === undefined)
            return st.uq;

        var ost = utils.filter(this.st, { keys: ['occrnt', 'ocnxt'], toStream: [true] });
        for (var j = 0; j < ost.length; j++)
        {
            if (st.uq === undefined || (Math.abs(ost[j].atm  - uq.close)) > 50)
                this.#oq(uq, ost[j]);
        }
        this.status = 'streaming';
        st.uq = uq;
    }

    static sn(appid)
    {
        return us.get(appid);
    }

    static exit(appid)
    {
        const sn = us.get(appid);
        if(sn === undefined)
            return;
        
        if(sn.mode !== 0 && sn.shared_with.size > 1)
            sn.shared_with.delete(appid);
        else
            us.delete(appid);
    }
}

export default Session;