const qserver = require('./quotes');
const iBreeze = require('./broker/breeze');
const iKNeo = require('./broker/kotakneo');
const ordersocket = require('./broker/brokerws');
const utils = require('../common/utils')
require('console-stamp')(console, '[HH:MM:ss.l]');

async function handleMessage(sn, event, msg)
{
    try {
        var bserver = sn.mode === 0 ? iBreeze : iKNeo;
        switch(event)
        {
            case 'start':
                /*sn.ini(msg, (action, list) => {
                    bserver.subscribe(sn.uid, list, action);
                });*/

                bserver.connect(sn.uid, msg.simStartTime);
                const stSubs = sn.inqsub(msg, (opSubs) => {
                        bserver.subscribe(sn.uid, opSubs, 'subs');
                    });
                bserver.subscribe(sn.uid, stSubs, 'subs');
                break;
            case 'resume':
                if (msg.continue === true)
                    bserver.subscribe(sn.uid, sn.inqsub(), 'subs');
                break;
            case 'preData':
                console.log("Pre data request " + new Date(msg.startTime));

                var prefq = iBreeze.preF(msg);
                emit(sn.uid, "futuresPreData", await prefq);

                /*var preUq = iBreeze.preU(msg);
                var uq = await preUq;
                //var preDq = iBreeze.preD(msg, uq[uq.length - 1]);
                //var pq = await preDq[0]; var cq = await preDq[1];
                //emit(sn.s, "qdeltastrikes", uq, pq, cq);*/
                break;
            case 'speed':
                iBreeze.changeSpeed(sn.uid, msg);
                break;
            case 'stop':
                bserver.subscribe(sn.uid, sn.unsuball(), 'unsuball');
                break;
            case 'prevsession':
                emit('prevsession', sn.status !== undefined)
            break;
            case 'ocnxt':
                var fst = utils.filter(sn.st, {keys: ['ocnxt']})[0];
                fst.toStream = msg === 'start' ? true : false;
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
                var response = await ordersocket.wsOps(sn.uid, msg.action, msg.data, sn.mode);
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

module.exports = {
    handleMessage,
}