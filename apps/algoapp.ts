import { Logger } from '../utils/logger.js';
import WebSocket from "ws";
import { MessagePort } from "node:worker_threads";
import { App } from "./webapp.js";
import { TSConfigService } from '../serverlocal/service/config/config.js';


export class AlgoApp extends App {
    parent: MessagePort;
    constructor(parent: MessagePort) {
        super("ALGOAPP");
        this.parent = parent;

        this.parent.on("message", (msg: any) => {
            this.parentNotification(msg)
        });
    }

    parentNotification(msg: any) {
        Logger.log(`message: ${msg} from parent`);
    }

    async startServices(): Promise<any> {
        const tsconfig = new TSConfigService();
        await tsconfig.init();

        tsconfig.initialize([]);
    }

    connect(s: WebSocket) {

    }


    registerHandlers(port: any) {
        port.on("message", (msg: any) => {
            this.handleMessage(msg)
        });
    }

    handleMessage(msg: any) {
        switch (msg.type) {
            case "history":
                break;
        }
    }

    send(port: any, type: string, msg: any) {
    }

    async tearDown(): Promise<any> {

    }
}
