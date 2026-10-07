import EventEmitter from "node:events";

class Service extends EventEmitter 
{
    constructor(name) {
        super();
        if (new.target === Service) {
            throw new TypeError("Cannot instantiate Parent class directly");
        }
        this.name = name;
        this.initialized = false;
        this.logEnabled = true;
    }

    init() 
    {
        if (!this.initialized) 
        {
            if (typeof this.cInit === 'function') 
                this.cInit();

            this.initialized = true;
            return { status: 'success' };
        }
        return { status: 'already initialized' };
    }

    tearDown()
    {

    
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