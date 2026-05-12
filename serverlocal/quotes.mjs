import utils from '../common/utils.mjs';
import Order_Notifier from '../serverlocal/service/order_engine.mjs';
Order_Notifier.addOrderUpdateListener(emitUpdates);
const socketmap = new Map();

function emitUpdates(appid, type, message)
{
    try {
        console.log("ws message: " + JSON.stringify(message));
        var s = socketmap.get(appid).socket;
        s.emit(type, message);
    } catch (error) {
        console.log(error);
    }
}

function emitQs(appid, q)
{
    try {
        var s = socketmap.get(appid).socket;
        if(s === undefined)
            return;

        if(q.key === 'index' || (q.exchange === 'MCX' && q.key === 'futures'))
            s.sn.lastuq(q);
        else if (q.key === 'strikex')
            utils.addIVNDelta(q, s.sn.lastuq());
        
        s.emit(q.key, q);
    } catch(error){
        console.error(error);
    }
}

function broadcast(type, msg){

    socketmap.keys().toArray().forEach((appid) => {
        var app_obj = socketmap.get(appid);

        if(app_obj.mode !== 0) {
            if(type === 'hb')
                emitUpdates(appid, type, msg)
            else (type === 'quote' && app_obj.stockCode === msg.stockCode)
                emitQs(appid, msg);
        }
    });
}

export default {
    socketmap,
    emitQs,
    emitUpdates,
    broadcast
}