import { Worker } from 'node:worker_threads';
import path from 'path';
import fs from 'fs';
import { MessagePort } from 'node:worker_threads';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'events';
import { PROCESS_PATH } from '../common/path.js';

export class SubProcessManager extends EventEmitter {
    name: string;
    child: Worker;
    connections: Map<string, [MessagePort, MessagePort]> = new Map();
    constructor(filepath: string, name: string) {
        super();
        this.name = name;
        this.child = new Worker(filepath, { name: name });

        this.child.on('error', (err) => {
            console.error(`${this.name} Worker encountered an unhandled error:`, err);
        });

        this.child.once('exit', (code) => {
            if (code !== 0) {
                console.error(`${this.name} Worker stopped unexpectedly with exit code ${code}`);
            }
        });
    }

    init() {
        this.child.on('message', (message: any) => {
            if (message.type === 'req_conn') {
                const key = randomUUID() as string;
                this.newChannel(key);
            }
        });
    }

    newChannel(id: string) {
        const { port1, port2 } = new MessageChannel()
        this.connections.set(id, [port1 as MessagePort, port2 as MessagePort]);
        this.child.postMessage({ type: 'connection', port: port2 as MessagePort, id: id }, [port2 as MessagePort]);
        this.emit('connection', id, port1);
    }
}

export class SubProcessLauncher {

    name: string;
    file: string;
    process?: SubProcessManager;

    constructor(name: string, file: string) {
        this.name = name;
        this.file = file;
        const filePath = path.join(PROCESS_PATH, process.env[file]!)!;
        if (!filePath || !fs.existsSync(filePath))
            return;

        this.process = new SubProcessManager(filePath, name);
    }

    async init() {
        this.process?.init();
    }
}
