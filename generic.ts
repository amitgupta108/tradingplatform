export class Generic {

    logEnabled: boolean;
    name: string;

    constructor(name: string) {
        this.name = name;
        this.logEnabled = true;
    }

    log(...args: string[]) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }

    error(...args: string[]) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }
}