import { Logger } from '../common/logger.js';
import { App } from "../common/app.js";
import { TSConfigService } from '../serverlocal/service/config/config.js';
import type { EventService } from '../serverlocal/service/system/eventservice.js';
import { MessagePort } from "node:worker_threads";
import { isMainThread } from 'node:worker_threads';

export class ProcessApp extends App {
    parent: boolean;
    initport: MessagePort | null = null;
    socketMap = new Map<string, MessagePort>();
    tsconfig!: TSConfigService;

    constructor(name: string) {
        super(name);
        this.parent = isMainThread;
    }

    async init() {
    }

    parentNotification(msg: any) {
        Logger.log(`message: ${msg} from parent`);
    }

    async startServices(names: string[]): Promise<any> {
        this.tsconfig = TSConfigService.getInstance();
        await this.tsconfig.initialize(names);
    }

    connect(port: MessagePort, id: string) {
        this.socketMap.set(id, port);

        const es = this.tsconfig.getServiceByName('EVENTSERVICE') as EventService;
        es.emit('algo_connect', this.name, port);
    }


    registerHandlers(port: MessagePort) {
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
