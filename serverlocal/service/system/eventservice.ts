import EventEmitter from 'events';
import { SystemService } from '../../../common/service.js';
type eventType = 'interval' | 'timeout' | 'immediate';

interface IEvent {
    active: boolean;
    ref: NodeJS.Timeout | undefined;
    type: eventType;
    interval?: number;
    timeout?: number;
}

export class EventService extends SystemService {

    eventer: EventEmitter = new EventEmitter();
    eod: Date = new Date();
    eos: Date = new Date();
    events: {
        OC_UNSUB: IEvent;
        ENDOFDAY: IEvent;
        ENDOFSESSION: IEvent;
        TEARDOWN: IEvent;
    };

    constructor(name: string) {
        super(name);
        this.eod.setHours(23, 59, 59);
        this.eos.setHours(15, 45, 0);
        this.events = {
            'OC_UNSUB': { active: true, ref: undefined, type: 'interval', interval: 10 }, //minutes
            'ENDOFDAY': { active: true, ref: undefined, type: 'timeout', timeout: this.eod.getTime() - Date.now() },
            'ENDOFSESSION': { active: true, ref: undefined, type: 'timeout', timeout: this.eos.getTime() - Date.now() },
            'TEARDOWN': { active: true, ref: undefined, type: 'immediate' },
        };
        this.log(this.eod.toLocaleString());
    }

    async init() {
        for (const [name, event] of Object.entries(this.events)) {
            if (event.active) {
                const type = event.type;
                if (type === 'interval')
                    this.setIntervalEvent(name);
                else if (type === 'timeout')
                    this.setTimeoutEvent(name);
            }
        }
        return true;
    }

    addListener(event: string, fn: any) {
        this.eventer.addListener(event, fn);
    }

    emit(event: string, ...args: any[]) {
        this.eventer.emit(event, ...args);
    }

    setIntervalEvent(name: string) {
        this.events[name].ref = setInterval(() => {
            this.eventer.emit('oc_unsub', { count: 7 });
        }, this.events[name].interval * 60 * 1000);
    }

    setTimeoutEvent(name: string) {
        if (this.events[name].timeout > 0) {
            this.events[name].ref = setTimeout(() => {
                this.log(`setTimeoutEvent ${name}`);
                this.eventer.emit(name, {});
            }, this.events[name].timeout);
        }
    }

    setImmediateEvent(name: string) {

    }

    clearEvent(name: string) {

    }

    activateEvent(name: string) {
        this.events[name].active = true;
    }

    triggerImmediate(name: string) {
        if (this.events[name].active && this.events[name].type === 'immediate') {
            this.log(`triggerImmediate ${name}`);
            this.eventer.emit(name, {});
        }
    }

    async tearDown(): Promise<any> {
        return true;
    }
}
