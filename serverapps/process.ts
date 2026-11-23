import { Worker } from 'node:worker_threads';
import path from 'path';
import fs from 'fs';
import { AlgoApp } from '../apps/algoapp.js';
import { MessagePort } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'events';

const processes = [{ type: 'ALGO', name: 'ORDERBASED' }]

export class SubProcessManager extends EventEmitter {
    name: string;
    self: Worker;
    connections: Map<string, [MessagePort, MessagePort]> = new Map();
    constructor(filepath: string, name: string) {
        super();
        this.name = name;
        this.self = new Worker(filepath, { name: name });
    }

    init() {
        this.self.on('message', (message: any) => {
            if (message.type === 'req_conn') {
                const key = randomUUID() as string;
                this.newChannel(key);
            }
        });
    }

    newChannel(id: string) {
        const { port1, port2 } = new MessageChannel()
        this.connections.set(id, [port1 as MessagePort, port2 as MessagePort]);
        this.self.postMessage({ type: 'connection', port: port2 as MessagePort, id: id }, [port2 as MessagePort]);
        this.emit('connection', id, port1);
    }
}

export class SubProcessLauncher {
    private processMap: Map<string, SubProcessManager> = new Map();
    private processdir = process.env.WORKSPACE_PATH + '/' + process.env.PROCESSES_PATH!;
    private algoAppManager?: AlgoApp;

    constructor() {
        for (const p of processes) {
            const filePath = path.join(this.processdir, process.env[`${p.name}_FILE`]!)!;
            if (!filePath || !fs.existsSync(filePath))
                continue;

            const child = new SubProcessManager(filePath, p.name);
            child.init();
            this.processMap.set(p.name, child);

            child.on('message', (message: any) => {
                if (message.type === 'req_conn') {
                    const key = randomUUID() as string;
                    child.newChannel(key);
                }
            });

            child.on('error', (err) => {
                console.error(`${p.name} Worker encountered an unhandled error:`, err);
            });

            child.once('exit', (code) => {
                if (code !== 0) {
                    console.error(`${p.name} Worker stopped unexpectedly with exit code ${code}`);
                }
            });
        }
    }

    async start() {

        for (const [k, v] of this.processMap) {
            if (k === 'ORDERBASED') {
                if (!this.algoAppManager)
                    this.algoAppManager = new AlgoApp('ALGOAPPMANAGER');

                await this.algoAppManager.startServices(['TSCONFIG']);
            }

            v.on('connection', (id: string, port: MessagePort) => {
                this.algoAppManager!.connect(port as MessagePort, id);
            })
        }
    }
}
