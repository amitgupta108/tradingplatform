import scrip_store from './service/scripstore.mjs';
import service_breeze from './broker/m_breeze.mjs';
import Session from './session/session.mjs';
import services from './service/services.mjs';
import qserver from './stream.mjs'; 

var live_order_locked = true;

function registerDataRequests(s, appid, mode)
{
    const market_service = services.getService('view', mode);

    s.on('vix', (msg) => {
        const vix_service = services.getService('vix', mode);
        vix_service.subscribe_vix(appid, mode, msg.action);
    });

    s.on('start', (msg) => {
        if(['skeletal', 'stopped'].includes(s.sn.status)){
            s.sn.ini(msg, (opSubs) => {
                market_service.subscribe(s.sn.appid, opSubs, 'subs', mode);
                //console.log('skip subscription list from session');
            });
            if(mode.startsWith('HISTORY'))
                market_service.clientConfigure(appid, msg.simStartTime, '1x');
        }
        market_service.start(appid, s.sn.inqsub(false), mode);
        s.emit('stream', 'started');
    });

    s.on('preData', async (msg) => {
        const vix_service = services.getService('vix', mode);
        if(msg.exchange === 'NFO')
        {
            console.log("Pre data request " + new Date(msg.startTime));
            for(var i in msg.keys)
            {
                var preQ = await vix_service.preQ(msg.keys[i], msg);
                s.emit('preData', msg.keys[i], await preQ);
            }
        }
    });

    s.on('speed', (msg) => {
        if(mode.startsWith('HISTORY'))
            market_service.changeSpeed(appid, msg);
    });

    s.on('stream', (msg) => {
        let resp_state = s.sn.stream(appid, 'pause');
        if(mode.startsWith('HISTORY'))
            resp_state = market_service.pause(appid, msg);
        s.emit('stream', resp_state);
    });

    s.on('exit', (msg) => {
        if(mode.startsWith('HISTORY')) {
            s.sn.remove(s.sn);
            market_service.exit(appid);
        }
        else
            s.sn.exit(appid, s.sn);
    });
    
    s.on('option_chain', (msg) => {
        s.sn.option_chain(msg.key, msg.action);
    });
}

function registerTradeRequests(s, appid, mode)
{
    const trading_service = services.getService('trade', mode);
    const profile = services.getProfile(mode);

    s.on('order', catchAsync((orders) => {
        console.log('order received at apiserver');
        if(profile['trade'] === 'SIMULATED' || !live_order_locked) 
            return trading_service.neworders(appid, profile['view'], orders);
    }, s));

    s.on('cancelorder', (msg) => {
        if (profile['trade'] === 'SIMULATED' || !live_order_locked)
            trading_service.cancelorder(appid, msg);
    });
    
    s.on('orderbook', async (msg) => {
        var response = await trading_service.orderbook(appid, msg);
        s.emit('orderbook', response);
    });
}

function registerAdminRequests(s, appid, mode)
{
    const profile = services.getProfile(mode);
    const admin_service = services.getService('admin', mode);

    if(profile['admin'] === 'LIVE_TRADING'){
        s.on('live_trading', (action, key) => {
            const lock = unlockLiveOrders(action, key);

            s.emit('live_trading', lock);
        }, s);

        s.on('wsOps', catchAsync(async (action, key) => {
            let response;
            if(action === 'open')
                response = await admin_service.authenticate(key);
            else if(action === 'close')
                response = admin_service.close(key);
            
            return {eventName:'wsOps', action:action, response:response};
        }, s));
    }

    if (profile['admin'] === 'LIVE_STREAMING') {    
        s.on('unsubscribe', (list) => {
            admin_service.subscribe(list, 'unsubs');
            s.sn.unqsub(list, 'unsubscribe')
        });
    }

    s.on('remove', () => {
        admin_service.subscribe([], 'unsubsall');
        s.sn.shared_with.forEach((item) => {
            if (item.appid != appid)
                qserver.socketmap.delete(item.appid);
        })
        s.sn.remove(s.sn);
    });
}

async function registerDisconnectionHandler(s, appid, mode)
{
    s.on("disconnect", (reason) => {
        if(reason === 'client namespace disconnect')
            exit(s, appid, mode);
        else if(['server namespace disconnect',
                'server shutting down', 'transport close', 'transport error'].includes(reason))
            console.log("socket disconnected  " + reason);
    });
}

function unlockLiveOrders(action, key)
{
    const today = new Date();
    if(key === today.toDateString()) {
        live_order_locked = action === 'open' ? false: action === 'close' ? true : true;
        scrip_store.load();
    }
    console.log('live order lock ' + live_order_locked);
    return live_order_locked;
}

function exit(s, appid, mode)
{
    if (mode.startsWith('HISTORY'))
        service_breeze.exit(appid);

    s.emit('exit', 'Exit initiated, connection being closed');
    Session.exit(appid, s.sn);
    qserver.socketmap.delete(appid);
    s.disconnect();

    console.log('user exited:' + appid);
}

const catchAsync = (handler, socket) => {
    return (...args) => {
        handler(...args)
        .then((result) => {
            toConsole(result);
        })
        .catch ((err) => {
            console.error(err);
        });
    };
};

function toConsole(result){
    console.log(result);
}

export default {
    registerDataRequests,
    registerTradeRequests,
    registerAdminRequests,
    registerDisconnectionHandler
};