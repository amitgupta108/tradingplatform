import { EventEmitter } from "events";
import type { MessageObject } from "../service/simulation/historysim.js";

export class NetworkProxy extends EventEmitter {
    readyState: number = 0;
    name: string = 'SIMSOCKET';
    requestor: string;
    responder?: string;

    constructor(requestor: string) {
        super();
        this.requestor = requestor;
    }

    send(json: string) {
        const msg = JSON.parse(json);
        this.emit(msg.type as string, msg.data)
    }

    close() {
        this.emit('close', {});
    }

    ping() {
        this.emit('ping', {});
    }
}