const iKws = require('./kotakws');
require('console-stamp')(console, '[HH:MM:ss.l]');

async function wsconnect(p)
{
    if (p.action === 'connect') {
        var lr = await iKws.apiLogin(p.tpt);

        if (lr.data.status === 'success') {
            var vr = await iKws.apiValidate({
                'sid': lr.data.sid,
                'token': lr.data.token
            });
            iKws.wsconnect(vr.data.baseUrl.substring(8), lr.data.token, vr.data.sid, wsmessage);
        }
        else
            console.log(JSON.stringify(lr));
    }
    else
        iKws.wsdisconnect();
}

function wsmessage(message)
{
    try {
        if (message.type === "cn")
            console.log("connection Update:", message.msg);
        else
            this.s.emit(message.type, message.data);
    } catch (error) {
        console.log(error);
    }
}

module.exports = {
    wsconnect,
  };