/*
const url = `wss://localhost:8080/?appid=${instrument.appid}&mode=${instrument.mode}&stockCode=${instrument.stockCode}`;
const uws = new WebSocket(url);
uws.binaryType = 'arraybuffer';

uws.onopen = () => {
    // Use your JSON contract to trigger the server's uWS.js hooks
    //uws.send(JSON.stringify({ action: 'join', room: 'lobby' }));
};

uws.onmessage = (event) => {
    const response = MessagePack.decode(event.data);
    console.log('Message from uWS Server:', (Date.now() - response.data.time));
};
*/