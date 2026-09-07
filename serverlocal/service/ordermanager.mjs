import qs from '../stream.mjs';
const live_order_map = new Map();
var counter = 10000;

class OrderManager 
{
    constructor(){
        this.live_order_map = new Map();
        this.counter = 10000;
    }

    neworders(appid, orders)
    {
        orders.forEach((order) => {
        
            order.filled_q = 0;
            order.pricedAt = 0;
            order.orderid = ++this.counter;
            order.localid = order.orderid;
            order.appid = appid;
            order.state = 'created';
            this.live_order_map.set(order.orderid, order);
        });
    }

    notifyme(message, trade_mode)
    {    
        const order = message.data;
        if (['open', 'complete', 'rejected', 'cancelled'].includes(order.ordSt))
        {
            this.liveOrderMatching(order, trade_mode);
            console.log('order notifcation ' + order.ordSt);
        }
    }

    liveOrderMatching(order, mode) 
    {
        const live_order = this.formatLiveOrder(order);
        let found = this.findMatch(live_order);

        if (found !== undefined) {
            live_order.appid = found.appid;
            this.live_order_map.delete(found.localid);
            this.live_order_map.set(live_order.orderid, live_order);
        }
        else {
            live_order.receiver = { stockCode: live_order.stockCode, trade_mode: mode };
            live_order.appid = live_order.stockCode + mode;
        }
        qs.emitOrders(live_order.appid, 'order', live_order);
    }

    findMatch(live_order) {
        const local_orders = Array.from(this.live_order_map.values());
        var found = local_orders.filter((order) => order.orderid === live_order.orderid);
        if (found === 1)
            return found[0];
        else if (found > 1) {
            console.error('inconsistent order map state ');
            return;
        }

        found = local_orders.filter((order) => {
            return order.state === 'opened'
                && order.symbol === live_order.symbol
                && order.action === live_order.action
                && order.pricetype === live_order.pricetype
                && order.price === live_order.price
                && order.quantity === live_order.quantity
                && order.quantity >= live_order.filled_q
                && ((order.state === 'submitted' && ['opened', 'rejected'].includes(live_order.state))
                    || (order.state === 'opened' && ['completed', 'cancelled'].includes(live_order.state)));
        });

        if (found.length === 0)
            return undefined;
        else if (found.length === 1)
            return found[0];
        else if (found.length > 1) //multiple open orders without kotak orderid, all with submitted status?
            return undefined;
    }

    formatLiveOrder(order)
    {
        var {nOrdNo: orderid, ordSt: state, avgPrc: pricedAt, prc: price, prod: product, sym: stockCode, trdSym: symbol, 
                expDt: expiry_date, stkPrc: strike_price, optTp: right, trnsTp: action, fldQty: filled_q, unFldSz: unfilled_q,
            qty: quantity, prcTp: pricetype, ordSrc: source, ...rest} = order;

        var fOrder = {orderid, state, pricedAt, price, product, stockCode, symbol, expiry_date, strike_price, right, action,
            filled_q, unfilled_q, quantity, pricetype, source};
        
        if(fOrder.state === 'open') {
            fOrder.state = 'opened';
            filled_q = 0;
        }
        else if(fOrder.state === 'complete')
            fOrder.state = 'completed';
        
        fOrder.pricetype = fOrder.pricetype === 'L' ? 'LIMIT' : 'MARKET';
        fOrder.action = fOrder.action === 'B' ? 'BUY' : 'SELL';
        fOrder.expiry_date = fOrder.expiry_date.replaceAll(', 20', '').replaceAll(' ', '').toUpperCase();
        fOrder.strike_price = fOrder.strike_price.replace('.00', '');
        fOrder.symbol = fOrder.stockCode + fOrder.expiry_date + fOrder.strike_price + fOrder.right;
        fOrder.mode = 'live';

        return fOrder;
    }

    formatPositionRecords(positions, stockCode)
    {
        return positions.filter((p) => 
            (Number(p.cfBuyQty) > 0 || Number(p.cfSellQty) > 0) && stockCode === p.sym)
            .map((fp) => {
                fp.expiry_date = fp.expDt.replaceAll(', 20', '').replaceAll(' ', '').toUpperCase();
                fp.strike_price = fp.stkPrc.replace('.00', '');
                fp.symbol = fp.sym + fp.expiry_date + fp.strike_price + fp.optTp;
                fp.cfBuyAmt = Number(fp.cfBuyAmt); fp.cfSellAmt= Number(fp.cfSellAmt);
                fp.cfBuyQty = Number(fp.cfBuyQty); fp.cfSellQty = Number(fp.cfSellQty);
                fp.pricedAt = fp.cfBuyAmt !== 0 ? fp.cfBuyAmt / fp.cfBuyQty : fp.cfSellAmt / fp.cfSellQty;
                fp.filled_q = fp.cfBuyQty !== 0 ? fp.cfBuyQty : fp.cfSellQty;
                fp.action = fp.cfBuyQty > 0 ? 'BUY' : 'SELL';
                fp.pricetype = 'MARKET';
                fp.state = 'completed';
                fp.orderid = -1;

                const { tok: token, sym: stockCode, symbol, pricedAt, filled_q, pricetype, action, state, orderid, ...rest} = fp;
                
                return {token, stockCode, symbol, pricedAt, filled_q, pricetype, action, state, orderid};
            });
    }
}

export const ordermanager = new OrderManager();