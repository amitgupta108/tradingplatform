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
    send(appid, type, order);
}

function emitQs(appid, q)
{
    send(appid, 'quote', q);

    if (q?.key === 'strikex')
        subsService.emit(q.key, q);

    const sn = Session.sn(appid);
    if (sn !== undefined && q?.key === 'futures')
        sn.lastuq(q);
}

function send(appid, type, msg)
{
    if (appid === undefined)
        return;

    const app_obj = socketmap.get(appid);
    if (app_obj !== undefined)
        emit(app_obj.socket, type, msg);
    else
        group_emit(appid, type, msg);
}

function group_emit(appid, type, msg)
{ 
    const receivers = getReceivers(appid, type, msg);   
    receivers.forEach((appid) => {
        emit(socketmap.get(appid).socket, type, msg);
    });
}

function getReceivers(appid, type, msg)
{
    const receivers = [];
    if (type === 'order' && msg.receiver !== undefined) {
        const mode_type = type === 'order' ? 'trade_mode' : 'view_mode';
        socketmap.forEach((v, k) => {
            if( v.stockCode === msg.receiver.stockCode
                && v.mode.contains(msg.receiver[mode_type]))
                receivers.push(k);
        });
    }
    else if(type === 'quote' && Session.sn(appid) !== undefined) {
        Session.sn(appid)?.shared_with.forEach((v, k) => {
            if (v.m_subs !== 'paused') 
                receivers.push(k);
        });
    }
    return receivers;
}

function broadcast(type, msg, group)
{
    for (const appid of socketmap.keys()) {
        var app_obj = socketmap.get(appid);
        if (app_obj && (type === 'hb' || (type === 'vix' && app_obj.mode.startsWith('S'))))
            emit(app_obj.socket, type, msg);
    }
}

function emit(s, type, msg)
{
    try{
        const key = type === 'quote' ? msg.key : type;
        s.emit(key, msg);
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