import { Logger } from "./logger.js";
export abstract class Generic {

    logEnabled: boolean;
    name: string;

    constructor(name: string) {
        this.name = name;
        this.logEnabled = true;
    }

    log(...args: string[]) {
        if (this.logEnabled) {
            Logger.log(`[${this.name}]`, ...args);
        }
    }

    error(...args: string[]) {
        if (this.logEnabled) {
            Logger.error(`[${this.name}]`, ...args);
        }
    }
}