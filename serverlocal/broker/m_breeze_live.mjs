import qutils from './quotesutils.mjs';
import Order_Service from '../service/ordersimulator.mjs';
import qserver from '../../srvr/qserver.mjs';
import streamer from '../stream.mjs';
import { Subscriptions } from '../session/appstate.mjs';
import services from '../service/services.mjs';

const myviewname = 'ICICILIVEVIEW';
const name = myviewname;
let view_mode;
let initialized = false;
let my_subs;

async function init(feature) 
{
    if (!initialized) {
        my_subs = new Subscriptions(myviewname);
        view_mode = services.getProviderModeKey(myviewname, 'view')?.at(0);

        const status = qserver.addListener('live-quote', onQuotes);
        initialized = true;
        return { status: 'success' };
    }
    return { status: 'already initialized' };
}

function startv2(appid, p) {
    const stock_subs = my_subs.addNewSubscriptions(p.stockCode + view_mode, p);
    stock_subs.addListener('ATMChange', onATMChange);
    const requests = stock_subs.getSubsItems(['index', 'futures']);
    subscribe(appid, requests, 'subs');
}

function subscribe(appid, list, action) 
{
    if (!list || list.length === 0)
        return;

    const requests = qutils.buildRequests(appid, list);
    qserver.live_sub(requests, action);
}

function option_chain(appid, stockCode, expiry, action) {
    const stock_subs = my_subs.getSubscriptions(stockCode + view_mode);
    const response = stock_subs.optionChainAction(expiry, action);
    if (response !== undefined) {
        subscribe(appid, response.strikes, response.action);
    }
}

function onATMChange(uq) {
    const l_appid = uq.stockCode + view_mode;

    const t = my_subs.getSubscriptions(l_appid);
    const strikesset = t.reloadStrikes(uq);

    strikesset.forEach((s) => {
        subscribe(l_appid, s, 'subs');
    });
}

function onQuotes(q) {
    const qt = qutils.standardize(myviewname, q);
    if (qt === undefined)
        return;

    const l_appid = qt.stockCode + view_mode;
    streamer.emitQs(l_appid, qt);

    setImmediate(() => {
        if (qt.key === 'index' || (qt.exchange === 'MCX' && qt.key === 'futures'))
            my_subs.getSubscriptions(l_appid)?.getNotified('index', qt);
        else if (qt.key === 'strikex')
            qutils.sendQsToSim(view_mode, qt);
    });
}
export default { init, subscribe, startv2, option_chain, name }