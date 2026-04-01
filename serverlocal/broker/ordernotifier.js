const iKws = require('./kotakws');
const qserver = require('../quotes');
const Session = require('../session/session');

require('console-stamp')(console, '[HH:MM:ss.l]');
var ws;

async function wsOps(uid, action, tpt)
{
    if (action === 'connect') {
        var lr = await iKws.apiLogin(tpt);

        if (lr.data.status === 'success') {
            var vr = await iKws.apiValidate({
                'sid': lr.data.sid,
                'token': lr.data.token
            });
            ws = iKws.wsconnect(vr.data.baseUrl.substring(8), lr.data.token, vr.data.sid, (msg) => {
                qserver.emitUpdates(uid, msg)
            });
        }
        else
            console.log(JSON.stringify(lr));
    }
    else if (action === 'disconnect')
        ws.close();
    else if(action ==='isAlive')
        return ws.readyState;
}

module.exports = {
    wsOps,
  };