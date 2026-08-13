import util_service from './broker/m_common.mjs';
import Session from './session/session.mjs';
import services from './service/services.mjs';
import { socketmap } from './session/appstate.mjs';
import { eventservice } from './service/eventservice.mjs';

function registerDataRequests(s, appid,  mode)
{
    const market_service = services.getService('view', mode);

    s.on('vix', (msg) => {
        util_service.subscribe_vix(appid, mode, msg.action);
    });

    s.on('startv2', (msg) => {
        if (mode.startsWith('HISTORY'))
            market_service.clientConfigure(appid, msg.simStartTime, '1x');
        
        market_service.startv2(appid, msg);
        //util_service.subscribe_vix(appid, mode, 'subs');
    });

    s.on('history', catchAsync(async (requests) => {
        console.log("history request " + requests.length);
        return util_service.history(appid, requests);
    }, 'history'));

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
        const stockCode = socketmap.get(appid).stockCode;
        market_service.option_chain(appid, stockCode, msg.expiry, msg.action);
    });

    s.on('snapshot', (msg) => {
        market_service.snapshot(appid, msg);
    })
}

function registerTradeRequests(s, appid, mode) {
    const trading_service = services.getService('trade', mode);

    s.on('order', (orders) => {
        console.log('order received at apiserver');
        orders.forEach(async (order) => {
            const updated = await trading_service.placeOrder(appid, order);
            console.log('order state ' + updated.state + ' ' + (updated.error ?? updated.orderid));
        });
    });

    s.on('cancelorder', async (msg) => {
        const response = await trading_service.cancelorder(appid, msg);
        console.log('cancel order ' + response.stat + ' ' + (response.emsg ?? response.oOrdNo))
    });

    s.on('orderbook', async (stockCode) => {
        s.emit('orderbook', await trading_service.orderbook(appid, stockCode));
    });

    s.on('positions', async (stockCode) => {
        s.emit('positions', await trading_service.positions(appid, stockCode));
    });
}

function registerAdminRequests(s, appid, mode)
{
    const profile = services.getProfile(mode);
    const admin_service = services.getService('admin', mode);

    if(profile['admin'] === 'LIVE_TRADING'){

        s.on('wsOps', catchAsync((action, key) => {
            if(action === 'open')
                return admin_service.authenticate(key);
            else if(action === 'close')
                return admin_service.close(key);            
        }, 'wsOps'));
    }

    if (profile['admin'] === 'BROKER_AUTH')
    {    
        s.on('authenticate', catchAsync((text) => {
            if(text.length === 8)
                eventservice.emit('ext_auth', { 
                    date: new Date().toDateString(),
                    provider: 'icici',
                    authcode: text
                });
            else 
                admin_service.authenticate(text);
        }, 'authenticate'));
    }

    if (profile['admin'].startsWith('LIVE_STREAMING')) 
    {
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

const catchAsync = (handler, eventName) => {
    return (...args) => {
        const rv = handler(...args);
        if(rv instanceof Promise)
            rv.then((response) => console.log(eventName + ' ' + JSON.stringify(response)))
                .catch ((error) => console.error(eventName + ' ' + JSON.stringify(error)));
        else 
            console.log(eventName + ' ' + JSON.stringify(rv));
    };
};

export default {
    registerDataRequests,
    registerTradeRequests,
    registerAdminRequests,
    registerDisconnectionHandler
};