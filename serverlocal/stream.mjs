import { ConfigService } from './service/.config/configservice.mjs'

function emitOrders(order)
{    
    send('order', order);
}

function emitQs(q)
{
    send('quote', q);
}

function emitHistQs(appid, key, qA) {
    const app_obj = ConfigService.getFromUserMap(appid);
    if (app_obj !== undefined)
        emit(app_obj.socket, 'history', { time: Date.now(), key: key, qA: qA });
}

function send(type, msg)
{
    const app_obj = ConfigService.getFromUserMap(msg.appid);
    if (app_obj !== undefined)
        emit(app_obj.socket, type, msg);
    else
        group_emit(type, msg);
}

function group_emit(type, msg)
{ 
    const receivers = getReceivers(type, msg);   
    receivers.forEach((appid) => {
        msg.appid = appid;
        emit(ConfigService.getFromUserMap(appid).socket, type, msg);
    });
}

function getReceivers(type, msg)
{
    const receivers = [];
    if (type === 'order') 
    {
        for (const [k, v] of ConfigService.usermapEntries()) {
            if(msg.modes.includes(v.mode))
                receivers.push(k);
        }
    }
    return receivers;
}

function broadcast(type, msg, group)
{
    for (const [k, v] of ConfigService.usermapEntries()) {
        if (v && (type === 'hb' || (type === 'vix' && !v.mode.startsWith('HISTORY'))))
            emit(v.socket, type, msg);
    }
}

function emit(s, type, msg)
{
    s.emit(type, msg);
}

export default {
    emitQs,
    emitOrders,
    emitHistQs,
    broadcast,
}