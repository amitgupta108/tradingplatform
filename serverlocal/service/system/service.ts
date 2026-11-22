import { EventEmitter } from 'events';
export abstract class Service extends EventEmitter {
    name: string;
    initialized: boolean;
    logEnabled: boolean;

    constructor(name: string) {
        super();
        if (new.target === Service)
            throw new TypeError("Cannot instantiate Parent class directly");

        this.name = name;
        this.initialized = false;
        this.logEnabled = true;
    }

    abstract tearDown(): Promise<any>;

    async init() {
        if (!this.initialized) {
            if (typeof (this as any).cInit === 'function')
                (this as any).cInit();

            this.initialized = true;
            return { status: 'success' };
        }
        return { status: 'already initialized' };
    }

    log(...args: string[]) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }

    error(...args: string[]) {
        if (this.logEnabled) {
            console.error(`[${this.name}]`, ...args);
        }
    }
}

export abstract class SystemService extends Service {
    constructor(name: string) {
        super(name);
    }
}

export abstract class InfraService extends Service {
    constructor(name: string) {
        super(name);
    }
}

export abstract class BrokerService extends Service {
    constructor(name: string) {
        super(name);
    }
}

export abstract class UserService extends Service {
    constructor(name: string) {
        super(name);
    }
}