import { Generic } from './generic.js';

export abstract class Service extends Generic {
    initialized: boolean = false;

    constructor(name: string) {
        super(name);
        if (new.target === Service)
            throw new TypeError("Cannot instantiate Parent class directly");
    }
    abstract init(): Promise<any>;
    abstract tearDown(): Promise<any>;
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