import { SystemService } from './service.js';
type eventType = 'interval' | 'timeout' | 'immediate';

interface IEvent {
    active: boolean;
    ref: NodeJS.Timeout | undefined;
    type: eventType;
    interval?: number;
    timeout?: number;
}

export class EventService extends SystemService {

    eod: Date;
    events: {
        OC_UNSUB: IEvent;
        ENDOFDAY: IEvent;
        TEARDOWN: IEvent;
    };

    constructor(name: string) {
        super(name);
        this.eod = new Date();
        this.eod.setHours(23, 59, 59);
        this.events = {
            'OC_UNSUB': { active: true, ref: undefined, type: 'interval', interval: 1 }, //minutes
            'ENDOFDAY': { active: true, ref: undefined, type: 'timeout', timeout: this.eod.getTime() - Date.now() },
            'TEARDOWN': { active: false, ref: undefined, type: 'immediate' },
        };
        this.log(this.eod.toLocaleString());
    }

    cInit() {
        for (const [name, event] of Object.entries(this.events)) {
            if (event.active) {
                const type = event.type;
                if (type === 'interval')
                    this.setIntervalEvent(name);
                else if (type === 'timeout')
                    this.setTimeoutEvent(name);
                else if (type === 'immediate')
                    this.setImmediateEvent(name);
            }
        }
        return true;
    }

    setIntervalEvent(name: string) {
        this.events[name].ref = setInterval(() => {
            this.emit('oc_unsub', { count: 7 });
        }, this.events[name].interval * 60 * 1000);
    }

    setTimeoutEvent(name: string) {
        this.events[name].ref = setTimeout(() => {
            this.emit('EOD', this.eod);
        }, this.events[name].timeout);
    }

    setImmediateEvent(name: string) {

    }

    clearEvent(name: string) {

    }
}
