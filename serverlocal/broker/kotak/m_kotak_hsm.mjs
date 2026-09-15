import {scripstore} from '../../service/scripstore.mjs';
import { HSMClient } from '../../service/clients/HSMClient.mjs'
import { KotakMarketData } from './m_kotak.mjs';
import utils from '../../../common/utils.mjs';
import { parse } from 'date-fns';

const pattern = "dd/MM/yyyy HH:mm:ss";
const options = {
    autoReconnect: true,
    maxRetries: 2,
    retryDelay: 2000,
    heartbeatInterval: 10000,
    throttleInterval: 120000,
    logEnabled: true,
};

class KotakMarketDataHSM extends KotakMarketData 
{
    constructor(name, provider)
    {
        super(name, provider);
        this.provider = new HSMClient(options);
    }

    onSnapshot(snapshot)
    {
        const qt = this.toScrip(snapshot);
        this.emitQuotes(qt);

        if (qt.key === 'futures')
            this.atmReview(qt);
    }

    standardize(q)
    {
        const qt = this.symbol_cache.get(q.tk);
        if (qt !== undefined && q.ltp !== undefined) {
            qt.ltp = q.name === 'sf' ? Number(q.ltp) : Number(q.iv);
            qt.ltt = q.m1;
            return qt;
        }
    }

    toScrip(snapshot)
    {
        let qt;
        if(snapshot.name === 'sf') {
            const { tk: token, e: exchange, ltp: ltp, ...rest } = snapshot;
            qt = { token, exchange, ltp};    
            qt.symbol = snapshot.e === 'mcx_fo' ? snapshot.ts : scripstore.findScripByKey('token', snapshot.tk)?.scripReferenceKey;
            qt.ltt = snapshot.fdtm !== undefined ? parse(snapshot.fdtm, pattern, new Date()).getTime() : Date.now();
        }
        else if (snapshot.name === 'if') {
            const { tk: token, e: exchange, iv: ltp,  ...rest } = snapshot;
            qt = { token, exchange, ltp};
            qt.symbol = scripstore.findScripByKey('token', snapshot.tk)?.scripReferenceKey ?? snapshot.tk;
            qt.ltt = snapshot.tvalue !== undefined ? parse(snapshot.tvalue, pattern, new Date()).getTime() : Date.now();
        }
        qt.ltp = Number(qt.ltp);
        this.symbol_cache.set(snapshot.tk, { ...qt, ...utils.expandSymbol(qt.symbol) });
    
        return this.symbol_cache.get(snapshot.tk);
    }
}

export const m_kotak_hsm = new KotakMarketDataHSM('KOTAKHSMVIEW', undefined);