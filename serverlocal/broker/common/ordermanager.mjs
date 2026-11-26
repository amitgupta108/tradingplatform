import { streamer } from '../../stream.js';
import { ConfigService } from '../../service/config/configservice.mjs';
import { UserService } from '../../../common/service.js'
import { KotakHSISocket } from '../clients/HSIClient.mjs';

export class OrderManager extends UserService {
    constructor(name) {
        super(name);
        this.order_generators = new Map();
        this.live_order_map = new Map();
        this.counter = 10000;
    }

    init() {
        this.initialized = true;
        return { status: 'success' };
    }

    async register(service_key, notifier) {
        if (notifier === 'HSICLIENT') {
            (await KotakHSISocket.getInstance()).addListener('order', (notifier_name, order) => {
                const services = Array.from(this.order_generators.entries());
                const service_keys = services.filter(([k, v]) => {
                    if (v === notifier_name)
                        return k;
                })
                this.notify('order', service_keys, order)
            });
        }
        this.order_generators.set(service_key, notifier);
    }

    neworders(appid, orders) {
        orders.forEach((order) => {

            if (order.orderid === undefined) {
                order.orderid = ++this.counter;
                order.localid = order.orderid;
                order.submittime = Date.now();
            }
            order.filled_q = 0;
            order.pricedAt = 0;
            order.appid = appid;
            this.live_order_map.set(order.orderid, order);
        });
    }

    notify(type, service_keys, message) {
        if (type === 'order' && ['open', 'complete', 'rejected', 'cancelled'].includes(message.ordSt))
            this.liveOrderMatching(service_keys, message);
        else if (type === 'position')
            this.emitPosition(service_keys, message);
    }

    liveOrderMatching(service_keys, order) {
        const live_order = this.formatLiveOrder(order);
        const found = this.findMatch(service_keys, live_order);
        if (found !== undefined) {
            live_order.appid = found.appid;
            live_order.trade_mode = found.trade_mode;
            live_order.strategy = found.strategy;
            live_order.localid = found.localid;
            live_order.submittime = found.submittime;
            live_order.executiontime = Date.now();
            this.live_order_map.delete(found.localid);
        }
        console.log('order notifcation ' + order?.ordSt + ' ' + order?.nOrdNo + ' found : ' + found?.orderid);

        live_order.modes = ConfigService.getParentModes('trade', service_keys);
        this.live_order_map.set(live_order.orderid, live_order);
        streamer.emitOrders(live_order);
    }

    findMatch(service_keys, live_order) {
        let found = this.live_order_map.get(live_order.orderid);
        if (found !== undefined)
            return found;

        const local_orders = Array.from(this.live_order_map.values());
        return local_orders.find((order) => {
            return service_keys.includes(order.trade_mode)
                && order.symbol === live_order.symbol
                && order.action === live_order.action
                && order.ordertype === live_order.ordertype
                && order.price === live_order.price
                && order.quantity === live_order.quantity
                && order.quantity >= live_order.filled_q
                && ((order.state === 'submitted' && ['opened', 'rejected'].includes(live_order.state))
                    || (order.state === 'opened' && ['completed', 'cancelled'].includes(live_order.state)));
        });
    }

    formatLiveOrder(order) {
        let { nOrdNo: orderid, avgPrc: pricedAt, prc: price, prod: product, sym: stockCode, trnsTp: action,
            fldQty: filled_q, qty: quantity, ordSrc: source, strategyCode: strategy, algid: algoid,
            algCat: algocategory, ...rest } = order;

        let fOrder = {
            orderid, pricedAt, price, product, stockCode, action, filled_q, quantity, source, strategy, algocategory, algoid
        };

        fOrder.state = (order.ordSt === 'open' ? 'opened' : order.ordSt === 'complete' ? 'completed' : order.ordSt);
        fOrder.ordertype = order.prcTp === 'MKT' ? 'MARKET' : 'LIMIT';
        fOrder.expiry_date = order.expDt.replaceAll(', 20', '').replaceAll(' ', '').toUpperCase();
        fOrder.strike_price = order.stkPrc.replace('.00', '');
        fOrder.symbol = stockCode + fOrder.expiry_date + fOrder.strike_price + order.optTp;
        fOrder.mode = 'live';

        return fOrder;
    }

    formatPositionRecords(positions, stockCode, cf) {
        return positions.filter((p) =>
            (Number(p.cfBuyQty) > 0 || Number(p.cfSellQty) > 0) && stockCode === p.sym)
            .map((fp) => {
                fp.expiry_date = fp.expDt.replaceAll(', 20', '').replaceAll(' ', '').toUpperCase();
                fp.strike_price = fp.stkPrc.replace('.00', '');
                fp.symbol = fp.sym + fp.expiry_date + fp.strike_price + fp.optTp;
                fp.cfBuyAmt = Number(fp.cfBuyAmt); fp.cfSellAmt = Number(fp.cfSellAmt);
                fp.cfBuyQty = Number(fp.cfBuyQty); fp.cfSellQty = Number(fp.cfSellQty);
                fp.pricedAt = fp.cfBuyAmt !== 0 ? fp.cfBuyAmt / fp.cfBuyQty : fp.cfSellAmt / fp.cfSellQty;
                fp.filled_q = fp.cfBuyQty !== 0 ? fp.cfBuyQty : fp.cfSellQty;
                fp.action = fp.cfBuyQty > 0 ? 'BUY' : 'SELL';
                fp.ordertype = 'MARKET';
                fp.state = 'completed';
                fp.orderid = -1;

                const { tok: token, sym: stockCode, symbol, pricedAt, filled_q, ordertype, action, state, orderid, ...rest } = fp;

                return { token, stockCode, symbol, pricedAt, filled_q, ordertype, action, state, orderid };
            });
    }

    getOpenOrder(service_key, orderid) {
        const order = this.live_order_map.get(orderid);
        if (order?.trade_mode === service_key)
            return order
    }

    addOrders(order) {
        this.live_order_map.set(order.orderid, order);
    }

    emitPosition(service_key, position) {
        //eventservice.emit(service_key, this.formatLivePosition(position));
    }

    formatLivePosition(position) {
        const { actId: account, sym: ts, exSeg: ex_segment, prod: product_type, flBuyQty: buyq, flSellQty: sellq, buyAmt: buyAmt,
            sellAmt: sellAmt, posFlg: positionFlag, sqrFlg: squareoffFlag, lotSz: lot_size, multiplier: multiplier, hsUpTm: updateTime } = position;
        return { account, ts, ex_segment, product_type, buyq, sellq, buyAmt, sellAmt, positionFlag, squareoffFlag, lot_size, multiplier, updateTime };
    }

}