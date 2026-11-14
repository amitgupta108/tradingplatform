import { EventEmitter } from 'events';

export class Service extends EventEmitter {
    name: string;
    initialized: boolean;
    logEnabled: boolean;

    constructor(name: string) {
        super();
        if (new.target === Service) {
            throw new TypeError("Cannot instantiate Parent class directly");
        }
        this.name = name;
        this.initialized = false;
        this.logEnabled = true;
    }

    init() {
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

export class SystemService extends Service {
    constructor(name: string) {
        super(name);
    }
}

export class InfraService extends Service {
    constructor(name: string) {
        super(name);
    }
}

export class BrokerService extends Service {
    constructor(name: string) {
        super(name);
    }
}

export class UserService extends Service {
    constructor(name: string) {
        super(name);
    }
}