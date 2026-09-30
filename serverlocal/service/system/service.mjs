import EventEmitter from "node:events";

export class SystemService extends EventEmitter {

    constructor(name)
    {
        super();
        this.name = name;
        this.initialized = false;
    }

    init()
    {
        this.initialized = true;
        return { status: 'initialized' };

    }
}