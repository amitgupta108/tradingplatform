import EventEmitter from "node:events";

class Service extends EventEmitter 
{
    constructor(name) {
        super();
        this.name = name;
        this.initialized = false;
        this.logEnabled = true;
    }

    init() {
        if (!this.initialized) {
            this.initialized = true;
            return { status: 'success' };
        }
        return { status: 'already initialized' };
    }
    
    log(...args) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }

}

export class SystemService extends Service {

    constructor(name)
    {
        super(name);
    }

}

export class InfraService extends Service {

    constructor(name)
    {
        super(name);
    }

}

export class BrokerService extends Service {

    constructor(name, provider)
    {
        super(name);
        this.provider = provider;
    }

}

export class UserService extends Service {

    constructor(name)
    {
        super(name);
    }

}