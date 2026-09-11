import {m_common_service as util_service} from './broker/m_common.mjs';
import { ConfigService } from './service/.config/configservice.mjs';
import { socketmap } from './session/appstate.mjs';
import { eventservice } from './service/eventservice.mjs';

function registerDataRequests(s, appid,  mode)
{
    const market_service = ConfigService.getActiveServiceByMode('view', mode);

    s.on('vix', (msg) => {
        util_service.subscribe_vix(appid, mode, msg.action);
    });

    s.on('startv2', (msg) => {
        if (mode.startsWith('HISTORY'))
            market_service.clientConfigure(appid, msg.simStartTime, '1x');
        
        market_service.startv2(appid, msg);
        util_service.subscribe_vix(appid, mode, 'subs');
    });

    s.on('history', catchAsync(async (requests) => {
        console.log("history request " + requests.length);
        for (const r of requests) {
            const resp = util_service.history(appid, r);
        }
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
        market_service.option_chain(appid, msg.expiry, msg.action);
    });

    s.on('snapshot', (msg) => {
        market_service.snapshot(appid, msg);
    })
}

function registerTradeRequests(s, appid, mode) {
    const trading_service = ConfigService.getActiveServiceByMode('trade', mode);

    s.on('order', (orders) => {
        console.log('order received at apiserver');
        orders.forEach(async (order) => {
            const updated = await trading_service.placeOrder(appid, order);
            console.log('order state ' + updated.state + ' ' + (updated.error ?? updated.orderid));
        });
    });

    s.on('updateorder', async (msg) => {
        let response;
        if (msg.action === 'modify')
            response = await trading_service.modifyOrder(appid, msg.orderid);
        else
            response = await trading_service.cancelOrder(appid, msg.orderid);
        console.log('update order ' + msg.action + ' ' + response.stat + ' ' + (response.emsg ?? response.oOrdNo))
    });

    s.on('orderbook', async (stockCode) => {
        const orderbook = await trading_service.orderbook(appid, stockCode);
        const cf_positions = await trading_service.positions(appid, stockCode);

        s.emit('orderbook', cf_positions.concat(orderbook));
    });

    s.on('positions', async (stockCode) => {
        s.emit('positions', await trading_service.positions(appid, stockCode));
    });
}

function registerAdminRequests(s, appid, mode)
{
    s.on('scrips', (filters) => {
        const scripstore = ConfigService.getAdminService(mode, 'SCRIP_STORE');
        const scrips = scripstore.getScrips(filters);
        s.emit('scrips', scrips);
    });

    s.on('authenticate', catchAsync((text) => {
        const service = ConfigService.getAdminService(mode, 'BROKER_AUTH');            
        if(text.length === 8)
            eventservice.emit('ext_auth', { 
                date: new Date().toDateString(),
                provider: 'icici',
                authcode: text
            });
        else 
            service.authenticate(text);
    }, 'authenticate'));

    s.on('unsubscribe', (list) => {
        admin_service.subscribe(list, 'unsubs');
        s.sn.unqsub(list, 'unsubscribe')
    });

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