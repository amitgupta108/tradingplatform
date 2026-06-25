import { BreezeConnect } from 'breezeconnect';

let breeze;
let isConnected = false;
let ws_callback;

function connect(callback) {
    ws_callback = callback;
    startSession();
}

function getLiveConnection() {
    if(!breeze || !isConnected)
        startSession();
    
    return breeze;
}

function startSession()
{
    breeze = new BreezeConnect({ "appKey": process.env.breeze_appKey });
    breeze.generateSession(process.env.breeze_secret, process.env.breeze_sid)
    .then((resp) => {
            breeze.wsConnect();
            breeze.onTicks = ws_callback;
            isConnected = true;
            console.log('breeze session started');
        })
        .catch((error) => {
            console.log('Error generating Breeze session ' + error)
        });
}
export default {connect, getLiveConnection};