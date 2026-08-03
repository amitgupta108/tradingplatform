import EventEmitter from 'node:events';

class EventService extends EventEmitter
{
    constructor() {
        super();
        this.initialized = false;
    }

    init(){
        this.initialized = true;
    }
}

export const eventservice = new EventService();