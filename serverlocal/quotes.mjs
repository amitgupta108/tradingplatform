import utils from '../common/utils.mjs';
import Session from './session/session.mjs';

const socketmap = new Map();

function emitOrders(appid, type, order)
{
    if(appid !== undefined){
        const app_obj = socketmap.get(appid);
        if(app_obj !== undefined)
            emit(app_obj.socket, type, order);
        else
        {
            const sn = Session.sn(order.appid);
            group_emit(sn, type, order);
        }
    }
    else //externally actioned orders
    {    
        console.error('Orphan order ' + JSON.stringify(order));
        const sn = Session.sn(order.stockCode); //stockCode search is to be built
        group_emit(sn, type, order);
    }
}

function emitQs(appid, q)
{
    const sn = Session.sn(appid);
    if(sn !== undefined)
    {
        if(q.key === 'index')
            sn.lastuq(q);
        else if (q.key === 'strikex')
            utils.addIVNDelta(q, sn.lastuq());

        group_emit(sn, q.key, q);
    }
}

function group_emit(sn, type, msg)
{
    for (const appid of socketmap.keys()) {
        const app_obj = socketmap.get(appid);
        if(app_obj && type === 'order')
            msg.appid = appid;
        emit(app_obj.socket, type, msg);
    };
}

function broadcast(type, msg, group)
{
    for (const appid of socketmap.keys()) {
        var app_obj = socketmap.get(appid);
        if (app_obj && app_obj.mode !== 0) {
            if (type === 'hb' || type === 'vix')
                emit(app_obj.socket, type, msg);
        }
    }
}

function emit(s, type, msg)
{
    try{
        s.emit(type, msg);
    } catch (error) {
        console.error(error);
    }
}

export default {
    socketmap,
    emitQs,
    emitOrders,
    broadcast
}