import wsOps from './broker/brokerws.mjs';

async function getService(mode, name) 
{ 
    var type = mode === 1 ? './broker/kotakneo.mjs' : './broker/breeze.mjs'; 
    
    if(name === 'icici')
        type = './broker/breeze.mjs'; 

    const impl = await import(type);
    return impl.default;
}

async function handleMessage(s, event, msg)
{
    try {
        const sn = s.sn;
        const bservice = await getService(sn.mode);
        switch(event)
        {
            case 'start':
                    if(sn.mode === 0)
                        bservice.init(sn.appid, msg.simStartTime, '1x');

                    const stSubs = sn.inqsub(msg, (opSubs) => {
                        bservice.subscribe(sn.appid, opSubs, 'subs');
                    });
                    bservice.subscribe(sn.appid, stSubs, 'subs');
                break;
            case 'preData':
                console.log("Pre data request " + new Date(msg.startTime));

                var preDService = await getService(sn.mode, 'icici');
                var prefq = await preDService.preF(sn.appid, sn.stockCode, msg);
                s.emit("futuresPreData", prefq);

                /*var preUq = iBreeze.preU(msg);
                var uq = await preUq;
                //var preDq = iBreeze.preD(msg, uq[uq.length - 1]);
                //var pq = await preDq[0]; var cq = await preDq[1];
                //emit(sn.s, "qdeltastrikes", uq, pq, cq);*/
                break;
            case 'speed':
                var sim = await getService(sn.mode, 'icici');
                sim.changeSpeed(sn.appid, msg);
                break;
            case 'stop':
                bservice.subscribe(sn.appid, sn.unsuball(), 'unsuball');
                break;
            case 'prevsession':
                s.emit('prevsession', sn.status !== undefined)
            break;
            case 'option_chain':
                sn.option_chain(msg.key, msg.action);
                break
            case 'order':
                var orsub = await bservice.order(sn.appid, msg);
                break;
            case 'cancelorder':
                await bservice.cancelorder(sn.appid, msg);
                break;
            case 'orderbook':
                var response = await bservice.orderbook(sn.appid, msg);
                s.emit(event, response);
                break;
            case 'wsOps':
                if(msg.action === 'unlock_live')
                    var response = bservice.unlockLiveOrders(msg.data);
                else
                    var response = await wsOps(msg.action, msg.data);
                console.log("wsOps response: " + msg.action + ' ' + response);
                break;
            default:
                console.log("Unknown event " + event);
        }
    } catch (error) {
        console.log('Error ' + error.stack);
    }
}

async function exit(sn)
{
    var s1 = await getService(0);
    s1.exit(sn.appid);
    
    if(sn.mode === 1) {
        var s2 = await getService(1);
        s2.exit(sn.appid, sn.unsuball());
    }
}

export default {
    handleMessage,
    exit
};