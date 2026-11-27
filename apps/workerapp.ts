import { App } from "../common/app.js";
import { SubProcessLauncher } from '../serverapps/process.js';
import { MessagePort } from 'worker_threads';

const processes = [
    { type: 'ALGO', name: 'ORDERBASED', active: true, file: 'ORDER_ALGO_FILE' },
    { type: 'ALGO', name: 'PRICEBASED', active: false, file: 'PRICE_ALGO_FILE' },
    { type: 'SERVER', name: 'ORDERSERVER', active: false, file: 'ORDER_SERVER_FILE' },
    { type: 'SERVER', name: 'INDICATORSERVER', active: false, file: 'INDICATOR_SERVER_FILE' }
]

export class ProcessApp extends App {
    private processList: Map<string, SubProcessLauncher> = new Map();

    constructor(name: string) {
        super(name);
    }

    async init() {
        for (const p of processes) {
            if (p.active) {
                const launcher = new SubProcessLauncher(p.name, p.file!);
                processes[p.name].ref = launcher;
                this.processList.set(p.name, launcher);

                launcher.process?.on('connection', (id: string, port: MessagePort) => {
                    this.connect(port as MessagePort, id);
                })
                await launcher.init();
            }
        }
    }

    async startServices() {
    }

    connect(port: MessagePort, id: string) {

        this.registerhandlers(port, id);
    }

    registerhandlers(port: MessagePort, id: string): void {

    }

    send(s: MessagePort, type: string, data: any): void {
        s.postMessage({ type, data });
    }

    async tearDown() {

    }
}
