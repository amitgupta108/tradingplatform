import qs from '../stream.mjs';
import { eventservice } from './eventservice.mjs';

class OrderManager 
{
    constructor(){
        this.live_order_map = new Map();
        this.counter = 10000;
    }

    neworders(appid, orders)
    {
        orders.forEach((order) => {
        
            if(order.orderid === undefined) {
                order.orderid = ++this.counter;
                order.localid = order.orderid;
            }
            order.filled_q = 0;
            order.pricedAt = 0;
            order.appid = appid;
            this.live_order_map.set(order.orderid, order);
        });
    }

    notifyme(type, service_key, message)
    {    
        console.log('order/position notifcation ' + JSON.stringify(message));
        if (type === 'order' && ['open', 'complete', 'rejected', 'cancelled'].includes(message.ordSt))
            this.liveOrderMatching(message);
        else if(type === 'position')
            this.emitPosition(service_key, message);
    }

    liveOrderMatching(order) 
    {
        const live_order = this.formatLiveOrder(order);
        
        if (live_order.source.includes('NEOTRADEAPI'))
        {
            const found = this.findMatch(live_order);
            if (found !== undefined) {
                live_order.appid = found.appid;
                live_order.trade_mode = found.trade_mode;
                this.live_order_map.delete(found.localid);
                this.live_order_map.set(live_order.orderid, live_order);
            }
        }
        qs.emitOrders(live_order.appid, 'order', live_order);
    }

    findMatch(live_order) 
    {
        let found = this.live_order_map.get(live_order.orderid);
        if (found !== undefined)
            return found;
        
        const local_orders = Array.from(this.live_order_map.values());
        return local_orders.find((order) => {
            return order.symbol === live_order.symbol
                && order.action === live_order.action
                && order.pricetype === live_order.pricetype
                && order.price === live_order.price
                && order.quantity === live_order.quantity
                && order.quantity >= live_order.filled_q
                && ((order.state === 'submitted' && ['opened', 'rejected'].includes(live_order.state))
                    || (order.state === 'opened' && ['completed', 'cancelled'].includes(live_order.state)));
        });
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

    formatPositionRecords(positions, stockCode, cf)
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

    getOpenOrder(service_key, orderid)
    {
        const order = this.live_order_map.get(orderid);
        if(order?.trade_mode === service_key)    
            return order
    }

    addOrders(order)
    {
        (this.live_order_map.get(order.orderid) === undefined)
            this.live_order_map.set(order.orderid, order);
    }

    emitPosition(service_key, position)
    {
        eventservice.emit(service_key, this.formatLivePosition(position));
    }

    formatLivePosition(position)
    {
        const { actId: account, sym: ts, exSeg: ex_segment, prod: product_type, flBuyQty: buyq, flSellQty: sellq, buyAmt: buyAmt, 
            sellAmt: sellAmt, posFlg: positionFlag, sqrFlg: squareoffFlag, lotSz: lot_size, multiplier: multiplier, hsUpTm: updateTime} = position;
        return {account, ts, ex_segment, product_type, buyq, sellq, buyAmt, sellAmt, positionFlag, squareoffFlag, lot_size, multiplier, updateTime};
    }

}

export const ordermanager = new OrderManager();