import qserver from '../../../srvr/qserver.mjs';
import utils from '../../../common/utils.mjs';
import { streamer } from '../../stream.mjs';
import { BrokerMarketDataImpl } from './m_broker_interface.mjs';
import { ConfigService } from '../../service/.config/configservice.mjs';
import { EXCHANGES, FUT_EXPIRIES} from '../../utils/constants.mjs';

export class CommonService extends BrokerMarketDataImpl 
{
    constructor(name)
    {
        super(name);
        this.qt_vix = { key: 'vix', stockCode: 'INDIAVIX', ltp: 0, ltt: 0 };
        this.vix_subscribed = false;
    }

    addListeners() 
    {
        qserver.addListener('vix', (q) => {
            this.onVix(q);
        });

        this.simulator = ConfigService.getServiceByName('SIMULATOR');
        if(process.env.PASSTHROUGH === 'Y') {
            this.provider = ConfigService.getAdapter('TPCLIENT');
            this.provider.addListener('quote', (arg) => this.onQuotes(arg));
        }
    }

    history(appid, r) 
    {
        const scrip = utils.expandSymbol(r.symbol);
        if (EXCHANGES[r.stockCode] !== 'mcx_fo')
        {
            r.exchange = ['NIFTY', 'INDVIX'].includes(r.symbol) ? 'NSE' : 'NFO';
            r.stockCode = r.symbol === 'INDVIX' ? 'INDVIX' : scrip.stockCode;
            r.expiry = r.symbol.includes('FUT') ? r.fExpiry ?? FUT_EXPIRIES[r.stockCode]['FIRST'] : scrip.expiry;
            r.interval = r.interval ?? '5minute';
            r.strike = r.strike ?? scrip.strike;
            r.right = r.right ?? scrip.right;

            return qserver.getHistory(appid, r)
            .then((response) => {
                if (response?.Error === null) {
                    streamer.emitHistQs(appid, r.symbol, response.Success);
                    return {status: 'success'};
                }
                return { status: 'error', reason: 'history fetch error ' + response.Error };
            });
        }
    }

    subscribe_vix(appid, mode, action) 
    {
        if (mode.startsWith('HISTORY')) 
            return this.simulator.subscribe_vix(appid, mode, action);
        else
            return qserver.subscribe_vix(appid, mode, action)
                .then((resp) => {
                    this.vix_subscribed = true;
                    console.log(resp);
                })
                .catch((error) => console.log(error));
    }

    onVix(q) 
    {
        if (q.last !== this.qt_vix.ltp) {
            this.qt_vix.ltt = Date.parse(q.ltt);
            this.qt_vix.ltp = q.last;
            streamer.broadcast('vix', this.qt_vix, 'all_nse_live');
        }
    }

    subscribe(appid, list, action) 
    {
        this.my_subs.addRequests(appid, list);
        if(action === 'subs' || action === 'start')
            this.provider.subscribe(list);
        else
            this.provider.unsubscribe(list);
    }

    standardize(q)
    {
        return q;
    }
}