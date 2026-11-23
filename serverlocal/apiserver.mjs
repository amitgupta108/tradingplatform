import { ConfigService } from './service/config/configservice.mjs';
import { SystemService } from './service/system/service.js';
import { streamer } from './stream.js';

class APIServer extends SystemService {
    constructor() {
        super('APISERVER');
    }

    catchAsync(handler, eventName) {
        return (...args) => {
            const rv = handler(...args);
            if (rv instanceof Promise)
                rv.then((response) => this.log(eventName + ' ' + JSON.stringify(response)))
                    .catch((error) => this.error(eventName + ' ' + JSON.stringify(error)));
            else
                this.log(eventName + ' ' + JSON.stringify(rv));
        };
    };

    registerDataRequests(s, appid, mode) {
        const util_service = ConfigService.getServiceByName('ICICIMARKETDATA');
        const market_service = ConfigService.getActiveServiceByMode('view', mode);

        s.on('startv2', (msg) => {
            //if (mode.startsWith('HISTORY'))
            //  market_service.clientConfigure(appid, msg.simStartTime, '1x');

            market_service.startv2(appid, msg);
        });

        s.on('history', this.catchAsync(async (request) => {
            this.log("history request " + request.symbols.length);
            let response = '';
            for (const symbol of request.symbols) {
                const history = await util_service.history({ ...request, symbol });
                s.emit('history', { symbol: symbol, qA: history });
                response += `${symbol} ${history?.length} `;
            }
            return response;

        }, 'history'));

        s.on('subscribe', (list) => {
            market_service.subscribe(appid, list, 'subs');
        });

        s.on('unsubscribe', (list) => {
            market_service.subscribe(appid, list, 'unsub');
        });

        s.on('speed', (msg) => {
            if (mode.startsWith('HISTORY'))
                market_service.changeSpeed(appid, msg);
        });

        s.on('stream', (action) => {
            market_service.stream(appid, action);
        });

        s.on('exit', (msg) => {
            market_service.exit(appid);
            streamer.deleteFromUserMap(appid);
            s.emit('exit', 'user initiated');
            s.disconnect();

            this.log('user exited:' + appid);
        });

        s.on('option_chain', (msg) => {
            market_service.option_chain(appid, msg.expiry, msg.action);
        });

        s.on('snapshot', (msg) => {
            market_service.snapshot(appid, msg);
        });
    }

    registerTradeRequests(s, appid, mode) {
        const trading_service = ConfigService.getActiveServiceByMode('trade', mode);

        s.on('order', (orders) => {
            this.log('order received at apiserver');
            orders.forEach(async (order) => {
                let updated;
                if (order.type === 'modify')
                    updated = await trading_service.modifyOrder(appid, order);
                else
                    updated = await trading_service.placeOrder(appid, order);
                this.log('order state ' + updated.state + ' ' + (updated.error ?? updated.orderid));
            });
        });

        s.on('updateorder', async (msg) => {
            let response;
            if (msg.action === 'modify')
                response = await trading_service.modifyOrder(appid, msg.orderid);
            else
                response = await trading_service.cancelOrder(appid, msg.orderid);
            this.log('update order ' + msg.action + ' ' + response.stat + ' ' + (response.emsg ?? response.oOrdNo))
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

    registerAdminRequests(s, appid, mode) {
        s.on('scrips', (filters) => {
            const scripstore = ConfigService.getAdminService(mode, 'SCRIP_STORE');
            const scrips = scripstore.getScrips(filters);
            s.emit('scrips', scrips);
        });

        s.on('authenticate', this.catchAsync((authcode) => {

            const provider = (authcode.length === 6 || authcode === 'tp-kotak-p') ? 'kotak' :
                (authcode.length === 8 || authcode === 'tp-icici-p') ? 'icici' : null;

            if (provider) {
                const service = ConfigService.getAdminService(mode, 'BROKER_AUTH');
                return service.authenticate(provider, authcode);
            }
        }, 'authenticate'));

        /*
        s.on('subscribe', (list, provider) => {
            const service = ConfigService.getAdminService(mode, 'LIVE_STREAMING');
            service.subscribe(appid, list, provider);
        });

        s.on('unsubscribe', (list, provider) => {
            const service = ConfigService.getAdminService(mode, 'LIVE_STREAMING');
            service.subscribe(appid, list, provider);
        });

        s.on('algo', (action) => {
            const service = ConfigService.getAdminService(mode, 'ALGO_SERVICE');
            return service.run('nse_fo|48704');
        });
        */
    }

    registerDisconnectionHandler(s, appid, mode) {
        s.on("disconnect", (reason) => {
            /*const market_service = ConfigService.getActiveServiceByMode('view', mode);
            market_service.exit(appid);
            streamer.deleteFromUserMap(appid);
            */
            this.log("socket disconnected  " + reason);
        });
    }

    async tearDown() {
        return true;
    }
}

export const apiserver = new APIServer();