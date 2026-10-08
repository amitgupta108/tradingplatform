import { SystemService } from './service.mjs';

export class EventService extends SystemService
{
    constructor(name) {
        super(name);
        this.eod = new Date();
        this.eod.setHours(23, 59, 59);
        this.events = {
            'OC_UNSUB': { active: true, ref: undefined, type: 'interval', interval: 1 }, //minutes
            'ENDOFDAY': { active: true, ref: undefined, type: 'timeout', timeout: this.eod.getTime() - Date.now() },
            'TEARDOWN': { active: false, ref: undefined, type: 'immediate' },
        };
        this.log(this.eod);
    }

    cInit()
    {
        for( const [n, e] of Object.entries(this.events))
        {
            if(e.active)
            {
                const type = this.events[n].type;
                if(type === 'interval')
                    this.setIntervalEvent(n);
                else if (type === 'timeout')
                    this.setTimeoutEvent(n);
                else if( type === 'immediate')
                    this.setImmediateEvent(n);
            }
        }
    }

    setIntervalEvent(name)
    {
        this.events[name].ref = setInterval(() => {
            this.emit('oc_unsub', {count: 8});
        }, this.events[name].interval * 60 * 60 * 1000);
    }

    setTimeoutEvent(name) 
    {
        this.events[name].ref = setTimeout(() => {
            this.emit('EOD', this.eod);
        }, this.events[name].timeout);
    }

    setImmediateEvent(name) {

    }

    clearEvent(name)
    {
        
    }
}
