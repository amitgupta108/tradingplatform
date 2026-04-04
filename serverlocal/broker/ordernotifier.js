const iKws = require('./kotakws');
const qserver = require('../quotes');

require('console-stamp')(console, '[HH:MM:ss.l]');
var ws;

async function wsOps(uid, action, tpt)
{
    var response = 'unknown state or action';
    if (action === 'connect') {
        var lr = await iKws.apiLogin(tpt);

        if (lr.data != undefined && lr.data.status === 'success') {
            var vr = await iKws.apiValidate({
                'sid': lr.data.sid,
                'token': lr.data.token
            });
            ws = iKws.wsconnect(vr.data.baseUrl.substring(8), lr.data.token, vr.data.sid, (msg) => {
                qserver.emitUpdates(uid, msg);
            });
            response = 'connected';
        }
        else{
            console.log(JSON.stringify(lr));
            response = 'failed to connect';
        }
    }
    else if (ws != undefined && action === 'disconnect') {
        ws.close();
        response = 'closed';
    }
    else if(ws != undefined && action ==='isAlive') {
        response = ws.readyState;
        qserver.emitUpdates(uid, {type: 'hb', data: response});
    }
    else
        console.log('wsOps: ' + response);
    
    return response;
}

module.exports = {
    wsOps,
  };