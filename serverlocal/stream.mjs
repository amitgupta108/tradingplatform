import Session from './session/session.mjs';
import services from './service/services.mjs';
import {socketmap, uwsmap} from './session/appstate.mjs';
import { Encoder} from '@msgpack/msgpack';

const FixSizeEncoder = new Encoder({
    maxSharedBufferSize: 32 * 1024
});

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

    //sendHistQs(appid, key, qA);
}

function sendHistQs(appid, key, qA)
{
    const uws = uwsmap.get(appid);
    if (uws !== undefined) {
        const payload = FixSizeEncoder.encodeSharedRef({ event: 'history', data: { time: Date.now(), key: key, qA: qA } });
        //console.log('payload size : ' + payload.byteLength);
        uws.send(payload, true);
    }
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
        if (type === 'order')
            msg.appid = appid;
        emit(socketmap.get(appid).socket, type, msg);
    });
}

function getReceivers(appid, type, msg)
{
    const receivers = [];
    if (type === 'order' && msg.receiver !== undefined) {
        const mode_type = type === 'order' ? 'trade_mode' : 'view_mode';
        socketmap.forEach((v, k) => {
            if( v.stockCode === msg.receiver.stockCode &&
                services.getFeatureMode(v.mode, 'trade') === msg.receiver[mode_type])
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
    const key = type === 'quote' ? msg.key : type;
    s.emit(key, msg);
}

export default {
    emitQs,
    emitOrders,
    emitHistQs,
    broadcast,
}