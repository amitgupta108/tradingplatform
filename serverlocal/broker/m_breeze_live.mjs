import qutils from './quotesutils.mjs';
import Order_Service from '../service/ordersimulator.mjs';
import qserver from '../../srvr/qserver.mjs';
import streamer from '../stream.mjs';
import path from 'path';

const name = path.parse(import.meta.filename).name;

let initialized = false;
const mode_live_icici = 'LIVE_2';

function subscribe(appid, instruments, action, mode)
{
    const requests = qutils.buildRequests(appid, instruments);
    qserver.live_sub(appid, instruments, action);
}

function onQuotes(q, mode, appid)
{
    var q = qutils.standardizeiq(q);
    streamer.emitQs(q.stockCode + mode_live_icici, q);
}

function init()
{
    if(!initialized) {
        const status = qserver.addListener('live-quote', onQuotes);

        initialized = true;
        return { status: 'success' };   
    }
}

export default {
    name,
    init,
    subscribe,
  };