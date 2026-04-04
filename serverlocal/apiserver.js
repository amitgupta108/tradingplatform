const qserver = require('./quotes');
const iBreeze = require('./broker/breeze');
const iKNeo = require('./broker/kotakneo');
const ordersocket = require('./broker/ordernotifier');
const utils = require('../common/utils')
require('console-stamp')(console, '[HH:MM:ss.l]');

async function handleMessage(sn, event, msg)
{
    try {
        var bserver = sn.mode === 0 ? iBreeze : iKNeo;
        switch(event)
        {
            case 'startstream':
                var minList = sn.ini(msg, (action, list) => {
                    bserver.subscribe(sn.uid, list, action);
                });
                if(minList.length > 0) {
                    bserver.connect(sn.uid, msg.simStartTime);
                    bserver.subscribe(sn.uid, minList, 'subs', '1x');
                }
                break;
            case 'resume':
                if (msg.continue === true)
                    bserver.subscribe(sn.uid, sn.inqsub(), 'subs');
                break;
            case 'preData':
                console.log("Pre data request " + new Date(msg.startTime));

                var preUq = iBreeze.preU(msg);
                var prefq = iBreeze.preF(msg);

                var uq = await preUq;
                emit(sn.uid, "futuresPreData", await prefq);

                //var preDq = iBreeze.preD(msg, uq[uq.length - 1]);
                //var pq = await preDq[0]; var cq = await preDq[1];
                //emit(sn.s, "qdeltastrikes", uq, pq, cq);
                break;
            case 'speed':
                iBreeze.changeSpeed(sn.uid, msg);
                break;
            case 'stop':
                bserver.subscribe(sn.uid, sn.unsuball(), 'unsub');
                break;
            case 'ocnxt':
                var fst = utils.filter(sn.st, {keys: ['ocnxt']})[0];
                fst.toStream = msg === 'start' ? true : false;
                break
            case 'order':
                var orsub = await bserver.order(msg);
                msg.orderid = orsub.orderid;
                msg.status = orsub.status;
                emit(sn.uid, "orderconf", msg);
            
                var ordconf = sn.mode === 1 ? 'liveorder' : 'simorder';
                emit(sn.uid, ordconf, await bserver.orderstatus(orsub.orderid));
                break;
            case 'positionbook':
                iKNeo.positionbook(uid, stockcode)
                break;
            case 'wsOps':
                var response = await ordersocket.wsOps(sn.uid, msg.action, msg.data);
                console.log("wsOps response: " + response);
                break;
            default:
                console.log("Unknown event " + event);
        }
    } catch (error) {
        console.log('Error ' + error.stack);
    }
}

function disconnect(uid, mode)
{
    iBreeze.disconnect(uid);
    //iKNeo.disconnect(uid);
}
function emit(uid, event, msg){
    qserver.emit(uid, event, msg);
}

module.exports = {
    handleMessage,
    disconnect
}