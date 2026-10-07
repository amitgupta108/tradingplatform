import { SystemService } from './service/system/service.mjs';
import { ConfigService } from './service/.config/configservice.mjs';

class StreamingService extends SystemService
{
    constructor(name)
    {
        super(name);
        this.name = name;
        this.usermap = new Map();
    }

    init()
    {
        this.es = ConfigService.getServiceByName('EVENTSERVICE');
        this.es.addListener('ordersim', (order) => {
            this.send('order', order);
        });
        this.initialized = true;
        return { status: 'initialized' };
    }

    emitOrders(order)
    {    
        this.send('order', order);
    }

    emitQs(q)
    {
        this.send('quote', q);
    }

    emitHistQs(appid, symbol, qA) {
        const app_obj = this.getFromUserMap(appid);
        if (app_obj !== undefined)
            this.emit(app_obj.socket, 'history', {symbol: symbol, qA: qA });
    }

    send(type, msg)
    {
        const app_obj = this.getFromUserMap(msg.appid);
        if (app_obj !== undefined)
            this.emit(app_obj.socket, type, msg);
        else
            this.group_emit(type, msg);
    }

    group_emit(type, msg)
    { 
        const receivers = this.getReceivers(type, msg);   
        receivers.forEach((appid) => {
            msg.appid = appid;
            this.emit(this.getFromUserMap(appid).socket, type, msg);
        });
    }

    getReceivers(type, msg)
    {
        const receivers = [];
        if (type === 'order') 
        {
            for (const [k, v] of this.usermapEntries()) {
                if(msg.modes.includes(v.mode))
                    receivers.push(k);
            }
        }
        return receivers;
    }

    broadcast(type, msg, group)
    {
        for (const [k, v] of this.usermapEntries()) {
            if (v && (type === 'hb' || (type === 'vix' && !v.mode.startsWith('HISTORY'))))
                this.emit(v.socket, type, msg);
        }
    }

     emit(s, type, msg)
    {
        if(type === 'vix')
            type = 'quote';
        s.emit(type, msg);
    }

    addToUserMap(appid, app_obj) {
        this.usermap.set(appid, app_obj);
    }

    getFromUserMap(appid) {
        return this.usermap.get(appid);
    }

    deleteFromUserMap(appid) {
        this.usermap.delete(appid);
    }

    usermapEntries() {
        return this.usermap.entries();
    }

}

export const streamer = new StreamingService('STREAMSERVICE');