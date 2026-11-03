export class Generic{

    constructor(logEnabled = true){
        this.logEnabled = logEnabled;
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