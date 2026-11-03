export class Generic {
    logEnabled;
    name;
    constructor(name) {
        this.name = name;
        this.logEnabled = true;
    }
    log(...args) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }
    error(...args) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }
}
