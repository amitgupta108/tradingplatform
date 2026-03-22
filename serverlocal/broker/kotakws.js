var ws;
const loginURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiLogin';
const ValURL = 'https://mis.kotaksecurities.com/login/1.0/tradeApiValidate';

async function apiLogin(num)
{
    var headers = {
        method: "POST",
        timeout: 0,
        headers: {
            "Authorization": '3ed099c0-1a60-4a65-b24f-8c42747ecffa',
            "neo-fin-key": 'neotradeapi',
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            mobileNumber: "+919871394231",
            ucc: "V1Z9A",
            totp: num
        }),
    };

    const response = await fetch(loginURL, headers);

    return await response.json();
}

async function apiValidate(headers) {
    var headers = {
        method: "POST",
        timeout: 0,
        headers: {
            'Authorization': '3ed099c0-1a60-4a65-b24f-8c42747ecffa',
            'neo-fin-key': 'neotradeapi',
            'Content-Type': "application/json",
            'sid': headers.sid,
            'Auth': headers.token
        },
        body: JSON.stringify({
            mpin:'221818' 
        }),
    };

    const response = await fetch(ValURL, headers);

    return await response.json();
}

function wsconnect(baseurl, token, sid, cb)
{
    ws = new WebSocket(`wss://${baseurl}/realtime`);

    ws.onopen = (event) => {
        const payload = `{type:cn,Authorization:${token},Sid:${sid},src:WEB}`;
        ws.send(payload);
        console.log('On open ');
    };

    ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        console.log("message type: " + message.type)
        cb(message);
    };

    ws.onerror = (event) => {
        console.log("connection error " + event);
    }; 
    
    ws.onclose = (event) => {
        console.log("connection closed " + event.reason);
    };
}

function wsdisconnect()
{
    ws.close();
}

module.exports = {
    apiLogin,
    apiValidate,
    wsconnect,
    wsdisconnect
}
