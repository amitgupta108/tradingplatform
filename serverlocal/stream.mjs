import Session from './session/session.mjs';

import EventEmitter  from 'node:events';
const subsService = new EventEmitter();
const socketmap = new Map();


function addEventLsitener(eventName, callback)
{
    subsService.addListener(eventName, callback);
}

function streaming_status(running, service, mode)
{
    console.log('streaming_status running ' + running + ' ' + service + ' ' + mode);
    const app_obj = Array.from(socketmap.values()).find((e) => e.mode === mode);
    app_obj.socket.sn.status = 'stopped';
}

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
    if(q?.key === 'strikex')
        subsService.emit(q.key, q);

    const sn = Session.sn(appid);
    if(sn !== undefined)
    {
        if(q.key === 'futures')
            sn.lastuq(q);

        group_emit(sn, q.key, q);
    }
}

function group_emit(sn, type, msg)
{
    if(sn.mode !== 0)
    {
        sn.shared_with.forEach((v, k) => {
            if(type === 'order' || v.m_subs !== 'stopped') {
                msg.appid = k;
                emit(socketmap.get(k).socket, type, msg);
            }
        });
    }
    else
    {   
        emit(socketmap.get(sn.appid).socket, type, msg)
    }
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
    broadcast,
    streaming_status,
    addEventLsitener
}