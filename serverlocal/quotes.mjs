import utils from './../common/utils.mjs';
const socketmap = new Map();

function emitQs(uid, q)
{
    try {
        var sn = usn(uid);
        if(sn === undefined)
            return;

        var key = 'strikex';
        if(q.stock_code === 'INDVIX')
            key = 'vix';
        else if (q.exchange === 'NSE' || (q.exchange === 'MCX' && q.symbol.endsWith('FUT')))
        {
            sn.lastuq(q);
            key = 'index';
        }
        else if (q.exchange === 'NFO' && q.symbol.endsWith('FUT'))
            key = 'futures';
        else if (q.symbol.endsWith('CE') || q.symbol.endsWith('PE'))
            utils.addIVNDelta(q, sn.lastuq());

        emit(uid, key, q);
    } catch(error){
        console.log(error);
    }
}

function emitUpdates(uid, message)
{
    try {
        console.log("ws message: ", JSON.stringify(message));

        if (message.type === "cn")
            emit(uid, 'ws-' + message.type, message.msg);
        else
            emit(uid, 'ws-' + message.type, message.data);
    } catch (error) {
        console.log(error);
    }
}

function emit(uid, event, msg){
    var s = socketmap.get(uid);
    s.emit(event, msg);
}

function broadcast(msg){
    console.log("ws-hb: ", JSON.stringify(msg));

    socketmap.values().toArray().forEach((s) => {
        s.emit('ws-' + msg.type, msg.data);
    });
}

function usn(uid){
    var s = socketmap.get(uid);
    return s !== undefined ? s.sn : undefined;    
}

export default {
    socketmap,
    emitQs,
    emitUpdates,
    emit,
    broadcast
}