import util_service from './broker/m_common.mjs';
import scrip_store from './service/scripstore.mjs';
import Session from './session/session.mjs';
import services from './service/services.mjs';
import { socketmap } from './session/appstate.mjs';

var live_order_locked = true;

function registerDataRequests(s, appid, mode)
{
    const market_service = services.getService('view', mode);

    s.on('vix', (msg) => {
        util_service.subscribe_vix(appid, mode, msg.action);
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

    s.on('startv2', (msg) => {
        if (mode.startsWith('HISTORY'))
            market_service.clientConfigure(appid, msg.simStartTime, '1x');
        
        market_service.startv2(appid, msg);
        s.emit('stream', 'started');
    });

    s.on('history', catchAsync(async (msg) => {
        console.log("history request " + new Date(msg.startTime));
        var response = await util_service.history(msg);
        if(response?.Error === null) {
            var event = msg.key === 'strikex' ? 'opt_history' : 'history';
            s.emit(event, msg.key, response.Success);
            return {status: 'success'};
        }
    }, s, 'history'));

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
        s.emit('exit', 'Exit initiated, connection being closed');
        if (mode.startsWith('HISTORY'))
            market_service.exit(appid);

        s.sn.exit(appid, s.sn);
        socketmap.delete(appid);
        s.disconnect();

        console.log('user exited:' + appid);
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
    }, s), 'order');

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

        s.on('wsOps', catchAsync((action, key) => {
            if(action === 'open')
                return admin_service.authenticate(key);
            else if(action === 'close')
                return admin_service.close(key);            
        }, s, 'wsOps'));
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
                socketmap.delete(item.appid);
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

const catchAsync = (handler, socket, eventName) => {
    return (...args) => {
        const rv = handler(...args);
        if(rv instanceof Promise) {
            rv.then((response) => {
                toConsole(eventName + ' ' + response?.status);
            })
            .catch ((err) => {
                console.error(err);
            });
        }
        else {
            toConsole(eventName + ' ' + rv);
        }
    };
};

function toConsole(status){
    console.log(status);
}

export default {
    registerDataRequests,
    registerTradeRequests,
    registerAdminRequests,
    registerDisconnectionHandler
};