import utils from '../../common/utils.mjs';

class Session
{
    uid;    
    mode;
    stockCode;
    st;
    subsupdate;
    status;
    constructor(uid, mode, stockCode)
    {
        this.uid = uid;
        this.mode = mode;
        this.stockCode = stockCode;
        this.st = [
            {key: 'index', stockCode: stockCode, toStream: true, streamState: 'initialized',},
            {key: 'futures', stockCode: stockCode, toStream: true, streamState: 'initialized',},
            {key: 'occrnt', stockCode: stockCode, toStream: true},
            {key: 'ocnxt', stockCode: stockCode, toStream: false},
            {key: 'vix', exchange: 'NSE', stockCode: 'INDVIX', toStream: true,
             symbol: 'INDVIX', streamState: 'initialized', source:'icicilive'},
        ];
    }

    ini(p, callback) 
    {
        for(var i = 0; i < 4; i++)
        {
            this.st[i].exchange = p.exc === 'MCX' ? p.exc : (i != 0 && i != 4) ? 'NFO' : this.mode === 0 ? 'NSE' : 'NSE_INDEX';
            this.st[i].symbol = i === 1 || p.exc === 'MCX' ? this.stockCode.concat(p.fExpiry).concat('FUT') : this.stockCode;
            if(i != 0)
            {
                this.st[i].expiry = i === 1 ? p.fExpiry : i === 2 ? p.oExpiry : p.oExpiryNxt;
                this.st[i].n = i != 1? p.lscount + 2: 0;
            }
        }
        this.subsupdate = callback;
        this.status = 'initialized';
    }

    #oq(uq, ost)
    {
        if(ost.atm !== undefined)
            ost.atm = ost.atm + Math.round((uq.close - ost.atm) / 50) * 50;
        else
            ost.atm = Math.round(uq.close/50) * 50;

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
                    symbol: (ost.stockCode + ost.expiry +
                        sks[i].strike +
                        (sks[i].right === 'Call' ? 'CE' : 'PE').toUpperCase())
                });
            }
            else if(lst.length > 0)
            {
                lst[0].toStream = true;
                if(lst.length > 1)
                    console.error('Possible stream confir duplication in session ' + lst[1].symbol);
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
        if(this.status !== 'initialized')
            this.ini(p, callback);

        var fst = utils.filter(this.st, {keys: ['index', 'futures', 'vix', 'occrnt']});
        fst.forEach((e) => e.toStream = true);
        this.status = 'stream requested';
        
        return utils.filter(this.st, {keys: ['index', 'futures', 'vix']});
    }
    
    unsuball() {
        this.st.forEach((e) => e.toStream = false);
        var ist = this.st.find((e) => e.key === 'index');
        ist.uq = undefined;
        this.status = 'stopped';
        return utils.filter(this.st, { notinkeys: ['occrnt', 'ocnxt']});
    }

    runOCNxt(action)
    {
        this.st[3].toStream = action;
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
}

export default Session;