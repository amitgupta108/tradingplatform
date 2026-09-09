import {socketmap} from './session/appstate.mjs';

function emitOrders(appid, type, order)
{    
    send(appid, type, order);
}

function emitQs(appid, q)
{
    send(appid, 'quote', q);
}

function emitHistQs(appid, key, qA) {
    const app_obj = socketmap.get(appid);
    if (app_obj !== undefined)
        emit(app_obj.socket, 'history', { time: Date.now(), key: key, qA: qA });
}

function send(appid, type, msg)
{
    const app_obj = socketmap.get(appid);
    if (app_obj !== undefined)
        emit(app_obj.socket, type, msg);
    else
        group_emit(type, msg);
}

function group_emit(type, msg)
{ 
    const receivers = getReceivers(type, msg);   
    receivers.forEach((appid) => {
        if (type === 'order')
            msg.appid = appid;
        emit(socketmap.get(appid).socket, type, msg);
    });
}

function getReceivers(type, msg)
{
    const receivers = [];
    if (type === 'order') 
    {
        socketmap.forEach((v, k) => 
        {
            if( v.stockCode === msg.stockCode)
                receivers.push(k);
        });
    }
/*    else if(type === 'quote' && Session.sn(appid) !== undefined) 
    {
        Session.sn(appid)?.shared_with.forEach((v, k) => {
            if (v.m_subs !== 'paused') 
                receivers.push(k);
        });
    } */
    return receivers;
}

function broadcast(type, msg, group)
{
    for (const [appid, app_obj] of socketmap.entries()) {
        if (app_obj && (type === 'hb' || (type === 'vix' && !app_obj.mode.startsWith('HISTORY'))))
            emit(app_obj.socket, type, msg);
    }
}

function emit(s, type, msg)
{
    const key = type === 'quote' ? msg.key : type;
    s.emit(key, msg);
}

export default {
    emitQs,
    emitOrders,
    emitHistQs,
    broadcast,
}