import utils from '../../common/utils.mjs';
import {strike_size} from '../../common/constants.mjs';


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
            {key: 'index', stockCode: stockCode, toStream: true},
            {key: 'futures', stockCode: stockCode, toStream: true},
            {key: 'occrnt', stockCode: stockCode, toStream: true, atm:0, n: 8},
            {key: 'ocnxt', stockCode: stockCode, toStream: false, atm:0, n: 8},
        ];
    }

    ini(p, callback) 
    {
        for(var i = 0; i < 4; i++)
        {
            this.st[i].exchange = i === 0 && p.exchange === 'NFO' ? 'NSE' : p.exchange;
            this.st[i].model = this.mode.startsWith('LIVE') ? 'live' : 'history';
            this.st[i].symbol = i === 1 ? this.stockCode.concat(p.fExpiry).concat('FUT') : this.st[i].stockCode;
            this.st[i].toStream = i === 3 || (i === 0 && p.exchange === 'MCX') ? false : true
            if(i != 0)
                this.st[i].expiry = i === 1 ? p.fExpiry : i === 2 ? p.oExpiry : p.oExpiryNxt;
        }
        this.subsupdate = callback;
        this.status = 'initialized';
    }

    #oq(uq, ost)
    {
        /*
        if(ost.atm === undefined || ost.atm === 0) {
            ost.atm = Math.round(uq.ltp/50) * 50;
            var sks = utils.strikes(ost.atm, ost.n);
        }
        else
        {
            ost.atm = ost.atm + Math.round((uq.ltp - ost.atm) / 50) * 50;
            const offset = Math.round((uq.ltp - ost.atm) / 50) ;
            var strike = offset > 0 ? ost.skrikes.at(-1).strike + 50 : ost.skrikes.at(0).strike - 50;
            var sks = [{strike: strike, right: 'CE'}, {strike: strike, right: 'PE'}];
            
        }
        */
       const gap = strike_size[this.stockCode]; 
        if(ost.atm === undefined || ost.atm === 0)
            ost.atm = Math.round(uq.ltp/gap) * gap;
        else
            ost.atm = ost.atm + Math.round((uq.ltp - ost.atm) / gap) * gap;
        
        var sks = utils.strikes(ost.atm, ost.n, gap);

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
                    model: this.mode.startsWith('HISTORY') ? 'history' : 'live',
                    symbol: ost.stockCode + ost.expiry +
                        sks[i].strike + sks[i].right
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
    
    inqsub(withOptionChain)
    {    
        if(['streaming', 'ready to run'].includes(this.status))
            return [];
        const keys = withOptionChain ? ['index', 'futures', 'occrnt', 'ocnxt'] : ['index', 'futures'];
        const list = this.st.filter((item) => keys.includes(item.key) 
                && item.toStream === true);
        this.status = list.length > 0 ? 'stream requested' : 'stream not configured';
        return list;
    }
    
    unqsub(list, action) 
    {
        if (action === 'unsubsall') 
        {
            this.status = 'skeletal';
            this.st = [];
        }
        else
        {
            list.forEach((item) => {
                var match = this.st.find((e) => item.symbol === e.symbol);
                if(match !== undefined)
                    match.toStream = false;
            });
        }
    }

    stream(appid, action)
    {
        const state = action === 'pause' ? 'paused' : 'resumed';
        if(this.mode.startsWith('HISTORY'))
            this.status = state;
        else
            this.shared_with.get(appid).m_subs = state;
        
        return state;
    }

    option_chain(key)
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
            if (st.uq === undefined || (Math.abs(ost[j].atm  - uq.ltp)) > strike_size[this.stockCode])
                this.#oq(uq, ost[j]);
        }
        this.status = 'streaming';
        st.uq = uq;
    }

    exit(appid, sn) {
        if(this.mode === 'HISTORY')
            us.delete(this.appid);
        else
            sn.shared_with.delete(appid);
    }

    static sn(appid)
    {
        return us.get(appid);
    }
}

export default Session;