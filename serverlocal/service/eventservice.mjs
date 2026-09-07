import EventEmitter from 'node:events';

class EventService extends EventEmitter
{
    constructor() {
        super();
        this.name = 'EVENTSERVICE';
        this.initialized = false;
    }

    init(){
        this.initialized = true;
        return { status: 'initialized' };
    }
}

export const eventservice = new EventService();