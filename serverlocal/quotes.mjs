import utils from '../common/utils.mjs';
import Order_Notifier from '../serverlocal/service/order_engine.mjs';
Order_Notifier.addOrderUpdateListener(emitOrders);
const socketmap = new Map();

function emitOrders(appid, type, message)
{
    console.log("ws update message: " + JSON.stringify(message));
    var app_obj = socketmap.get(appid);
    if(app_obj != undefined)
        emit(app_obj.socket, type, message);
    else
    {    
        const ssn = Session.filter(appid);
        ssn[0].appids.forEach((a) => {
            const app_obj = socketmap.get(a);
            emit(a.socket, q.key, q);
        });
    }
}

function broadcast(type, msg){

    socketmap.keys().toArray().forEach((appid) => {
        var app_obj = socketmap.get(appid);
        
        if(app_obj.mode !== 0) {
            if(type === 'hb')
                emit(app_obj.socket, type, msg);
        }
    });
}

function emitQs(appid, q)
{
    const ssn = Session.filter(appid);
    if(ssn !== undefined && ssn.length === 1)
    {
        const sn = ssn[0];
        if(q.key === 'index' || (q.exchange === 'MCX' && q.key === 'futures'))
            sn.lastuq(q);
        else if (q.key === 'strikex')
            utils.addIVNDelta(q, s.sn.lastuq());
    
        sn.appids.forEach((a) => {
            const app_obj = socketmap.get(a);
            emit(a.socket, q.key, q);
        });
    }
}

function emit(s, type, msg)
{
    s.emit(type, msg);
}

export default {
    socketmap,
    emitQs,
    emitOrders,
    broadcast
}