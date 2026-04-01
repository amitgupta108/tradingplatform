const iBreeze = require('./broker/breeze');
const Session = require('./session/session');
const iKNeo = require('./broker/kotakneo');
const ordersocket = require('./broker/ordernotifier');
const utils = require('../common/utils')
require('console-stamp')(console, '[HH:MM:ss.l]');

async function handleMessage(sn, event, msg, cb)
{
    try {
        var bserver = sn.mode === 0 ? iBreeze : iKNeo;
        switch(event)
        {
            case 'startstream':
                sn.ini(msg, (list) => {
                    bserver.subscribe(sn.uid, list);
                });
                bserver.connect(sn.uid, msg.simStartTime);
                bserver.subscribe(sn.uid, sn.inqsub());
                break;
            case 'resume':
                if (msg.continue === true)
                    bserver.subscribe(sn.uid, sn.inqsub());
                break;
            case 'preData':
                console.log("Pre data request " + new Date(msg.startTime));

                if(msg.mode === 1)
                {
                    iKNeo.connect(msg.uid, msg.simStartTime, sn.cb);
                    var prefq = await iKNeo.history(msg);
                    cb(sn.s, "futuresPreData", prefq);
                }
                else
                {
                    var preUq = iBreeze.preU(msg);
                    var prefq = iBreeze.preF(msg);

                    var uq = await preUq;
                    cb(sn.s, "futuresPreData", await prefq);

                    //var preDq = iBreeze.preD(msg, uq[uq.length - 1]);
                    //var pq = await preDq[0]; var cq = await preDq[1];
                    //emit(sn.s, "qdeltastrikes", uq, pq, cq);
                }
                break;
            case 'speed':
                /*if (p === 10 || p === 12) {
                    sn.cg.speed = 2;
                    sn.cg.interval = 990/p*2;
                } else {
                    sn.cg.speed = 1;
                    sn.cg.interval = 990/p;
                }
                stServer.startStreamer(sn); */

                bserver.changeSpeed(msg);
                break;
            case 'stop':
                bserver.unsubscribe(sn.uid, sn.unsuball());
                break;
            case 'ocnxt':
                var fst = utils.filter(sn.st, {keys: ['ocnxt']})[0];
                fst.toStream = msg === 'start' ? true : false;
                break
            case 'order':
                var orsub = await bserver.order(msg);
                msg.orderid = orsub.orderid;
                msg.status = orsub.status;
                cb(sn.uid, "orderconf", msg);
            
                var ordconf = sn.mode === 1 ? 'liveorder' : 'simorder';
                cb(sn.uid, ordconf, await bserver.orderstatus(orsub.orderid));
                break;
            case 'wsOps':
                ordersocket.wsOps(sn.uid, msg.action, msg.tpt);
                break;
            case 'isAlive':
                var isAlive = ordersocket.wsOps(sn.uid, msg);
                cb(sn.uid, 'isalive', isAlive);
                break;
            default:
                console.log("Unknown event " + event);
        }
    } catch (error) {
        console.log('Error ' + error.stack);
    }
}

function order(bserver, msg)
{
    var orsub = bserver.order(msg);

    return msg;
}

module.exports = {
    handleMessage,
}