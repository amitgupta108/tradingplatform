import hist_service from './broker/m_breeze.mjs';
import live_openalgo from './broker/m_t_openalgo.mjs';
import live_kotak from './broker/t_kotakneo.mjs';
import live_icici from './broker/m_breeze.mjs';
import paper_trading from './broker/m_breeze.mjs';
import Session from './session/session.mjs';
import livetradenotifier from './service/livetradenotifier.mjs';

/* mode
0: historical backtest
1: live kotak-openalgo data, kotak-neo-api orders
2: live kotak-openalgo data, orders simulated
3: live kotak-openalgo data and orders submission openalgo orderconf kotakws
4: live icici data and kotak-openalgo orders
*/

async function handleMessage(s, appid, event, msg)
{
    try {
        const sn = s.sn;
        const market_service = sn.mode === 0 ? hist_service : sn.mode === 1 ? live_openalgo : live_kotak;
        const trading_service  = sn.mode === 1 ?  live_openalgo: live_kotak;
        
        switch(event)
        {
            case 'start':
                    if(sn.mode === 0)
                        market_service.init(sn.appid, msg.simStartTime, '1x');

                    const stSubs = sn.inqsub(msg, (opSubs) => {
                        market_service.subscribe(sn.appid, opSubs, 'subs');
                    });
                    market_service.subscribe(sn.appid, stSubs, 'subs');
                break;
            case 'preData':
                console.log("Pre data request " + new Date(msg.startTime));

                var prefq = await hist_service.preF(appid, sn.stockCode, msg);
                s.emit("futuresPreData", prefq);

                /*var preUq = iBreeze.preU(msg);
                var uq = await preUq;
                //var preDq = iBreeze.preD(msg, uq[uq.length - 1]);
                //var pq = await preDq[0]; var cq = await preDq[1];
                //emit(sn.s, "qdeltastrikes", uq, pq, cq);*/
                break;
            case 'speed':
                if(sn.mode === 0)
                    hist_service.changeSpeed(appid, msg);
                break;
            case 'stop':
                market_service.subscribe(appid, sn.unsuball(appid), 'unsuball');
                break;
            case 'prevsession':
                s.emit('prevsession', sn.status)
            break;
            case 'option_chain':
                sn.option_chain(msg.key, msg.action);
                break
            case 'order':
                var orsub = await trading_service.order(appid, msg);
                break;
            case 'modifyorder':
                var mres = await trading_service.modifyorder(appid, msg);
                break;
            case 'cancelorder':
                await trading_service.cancelorder(appid, msg);
                break;
            case 'orderbook':
                var response = await trading_service.orderbook(appid, msg);
                s.emit(event, response);
                break;
            case 'wsOps':
                if(msg.action === 'unlock_live')
                    var response = live_openalgo.unlockLiveOrders(msg.data);
                else
                    if(msg.action === 'connect')
                        var response = await livetradenotifier.connect(msg.data);
                    else if(msg.action === 'disconnect')
                        var response = await livetradenotifier.disconnect(msg.data);
                break;
            default:
                console.log("Unknown event " + event);
        }
    } catch (error) {
        console.log('Error ' + error.stack);
    }
}

async function exit(appid)
{
    const sn = Session.sn(appid);
    if(sn === undefined)
        return;
    
    if(sn.mode === 0)
        hist_service.exit(appid);
    else
        if(sn.shared_with.size === 2)
            live_openalgo.exit(appid);
}

export default {
    handleMessage,
    exit
};