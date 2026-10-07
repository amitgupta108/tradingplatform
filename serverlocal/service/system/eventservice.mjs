import { SystemService } from './service.mjs';

export class EventService extends SystemService
{
    constructor(name) {
        super(name);
        this.events = {
            'ENDOFDAY': { active: true, ref: undefined, type: 'timeout' },
            'TEARDOWN': { active: true, ref: undefined, type: 'immediate' },
            'OC_UNSUB': { active: true, ref : undefined, type: 'interval', interval: 1} //minutes
        };
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
        const today = new Date();
        today.setHours(23, 59, 59);
        this.log(today);

        this.events[name].ref = setTimeout(() => {
            this.emit('EOD', today);
        }, today.getTime() - Date.now());
    }

    setImmediateEvent(name) {

    }

    clearEvent(name)
    {
        
    }
}
