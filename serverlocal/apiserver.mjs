import qserver from './quotes.mjs'; 
import wsOps from './broker/brokerws.mjs';
import iKotakNeo from './broker/kotakneo.mjs';
import iBreeze from './broker/breeze.mjs';

function getBrokerService(mode, name) 
{
    var service;
    if (mode === 0 || name === 'breeze') {
        service = iBreeze;
    } else {
        service = iKotakNeo;
    }
    return service;
}

async function handleMessage(sn, event, msg)
{
    try {
        const bserver = getBrokerService(sn.mode);
        switch(event)
        {
            case 'start':
                    if(sn.mode === 0)
                        bserver.init(sn.uid, msg.simStartTime, '1x');

                    const stSubs = sn.inqsub(msg, (opSubs) => {
                        bserver.subscribe(sn.uid, opSubs, 'subs');
                    });
                    bserver.subscribe(sn.uid, stSubs, 'subs');
                break;
            case 'preData':
                console.log("Pre data request " + new Date(msg.startTime));

                var prefq = getBrokerService(-1, 'breeze').preF(sn.uid, sn.stockCode, msg);
                emit(sn.uid, "futuresPreData", await prefq);

                /*var preUq = iBreeze.preU(msg);
                var uq = await preUq;
                //var preDq = iBreeze.preD(msg, uq[uq.length - 1]);
                //var pq = await preDq[0]; var cq = await preDq[1];
                //emit(sn.s, "qdeltastrikes", uq, pq, cq);*/
                break;
            case 'speed':
                getBrokerService(-1, 'breeze').changeSpeed(sn.uid, msg);
                break;
            case 'stop':
                bserver.subscribe(sn.uid, sn.unsuball(), 'unsuball');
                break;
            case 'prevsession':
                emit('prevsession', sn.status !== undefined)
            break;
            case 'ocnxt':
                sn.runOCNxt(true);
                break
            case 'order':
                var orsub = await bserver.order(sn.uid, msg);
                break;
            case 'cancelorder':
                await bserver.cancelorder(sn.uid, msg);
                break;
            case 'orderbook':
                var response = await bserver.orderbook(sn.uid, msg);
                emit(sn.uid, event, response);
                break;
            case 'wsOps':
                var response = await wsOps(sn.uid, msg.action, msg.data, sn.mode);
                console.log("wsOps response: " + response);
                break;
            default:
                console.log("Unknown event " + event);
        }
    } catch (error) {
        console.log('Error ' + error.stack);
    }
}

function emit(uid, event, msg){
    qserver.emit(uid, event, msg);
}

export default {
    handleMessage
};