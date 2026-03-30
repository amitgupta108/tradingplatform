const iKws = require('./kotakws');
const Session = require('../session/session');
require('console-stamp')(console, '[HH:MM:ss.l]');

async function wsconnect(uid, p)
{
    if (p.action === 'connect') {
        var lr = await iKws.apiLogin(p.tpt);

        if (lr.data.status === 'success') {
            var vr = await iKws.apiValidate({
                'sid': lr.data.sid,
                'token': lr.data.token
            });
            iKws.wsconnect(vr.data.baseUrl.substring(8), lr.data.token, vr.data.sid, (msg) => {
                wsmessage(uid, msg)
            });
        }
        else
            console.log(JSON.stringify(lr));
    }
    else if (p.action === 'disconnect')
        iKws.wsdisconnect();
}

function wsmessage(uid, message)
{
    try {
        console.log("ws message: ", JSON.stringify(message));
        var usersn = Session.sn(uid);

        if (message.type === "cn")
            usersn.s.emit(message.type, message.msg);
        else
            usersn.s.emit(message.type, message.data);
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    wsconnect,
  };