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

    addListeners(providers, listener){
        events.forEach((e) => {
            this.addListener();
        })

    }
}

export const eventservice = new EventService();