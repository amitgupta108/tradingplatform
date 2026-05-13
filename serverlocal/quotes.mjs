import utils from '../common/utils.mjs';
import Order_Notifier from '../serverlocal/service/order_engine.mjs';
Order_Notifier.addOrderUpdateListener(emitUpdates);
const socketmap = new Map();

function emitUpdates(appid, type, message)
{
    console.log("ws update message: " + JSON.stringify(message));
    var app_obj = socketmap.get(appid);

    if(app_obj != undefined)
        emit(app_obj.socket, type, message);
    else
        broadcast(type, message);

}

function broadcast(type, msg){

    socketmap.keys().toArray().forEach((appid) => {
        var app_obj = socketmap.get(appid);

        if(app_obj.mode !== 0) {
            if(type === 'hb' || type === 'order')
                emit(app_obj.socket, type, msg);
            else if(type === 'order' && app_obj.stockCode === msg.stockCode)
                emit(app_obj.socket, type, msg);
            else if(type === 'quote' && app_obj.stockCode === msg.stockCode)
                emitQs(app_obj.socket, msg);
        }
    });
}

function emitQs(s, q)
{
    try {
        if(q.key === 'index' || (q.exchange === 'MCX' && q.key === 'futures'))
            s.sn.lastuq(q);
        else if (q.key === 'strikex')
            utils.addIVNDelta(q, s.sn.lastuq());
        
        emit(s, q.key, q);
    } catch(error){
        console.error(error);
    }
}

function emit(s, type, msg)
{
    s.emit(type, msg);
}

export default {
    socketmap,
    emitQs,
    emitUpdates,
    broadcast
}