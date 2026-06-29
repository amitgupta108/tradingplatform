import { BreezeConnect } from 'breezeconnect';

let breeze;
let isConnected = false;
let ws_callback;

function connect(callback, withsocket = false) {
    ws_callback = callback;
    if (!breeze || !isConnected)
        return startSession(withsocket);
}

async function getLiveConnection(withsocket = false) {
    if(!breeze || !isConnected)
        await startSession(withsocket);

    return breeze;
}

function startSession(withsocket)
{
    breeze = new BreezeConnect({ "appKey": process.env.breeze_appKey });
    return breeze.generateSession(process.env.breeze_secret, process.env.breeze_sid)
    .then((resp) => {
        if(withsocket) {
            breeze.wsConnect();
            breeze.onTicks = ws_callback;
        }
        isConnected = true;
        console.log('breeze session started');
    });
}
export default {connect, getLiveConnection};