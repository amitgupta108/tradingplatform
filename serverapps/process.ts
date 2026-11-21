import { Worker } from 'node:worker_threads';
import path from 'path';
import fs from 'fs';

const processes = ['ALGO']
export class SubProcessLauncher {
    private processMap: Map<string, Worker> = new Map();
    private processdir = process.env.WORKSPACE_PATH + '/' + process.env.PROCESSES_PATH!;
    constructor() {
    }

    async start() {
        for (const p of processes) {
            const filePath = path.join(this.processdir, process.env[`${p}_FILE`]!)!;
            if (!filePath || !fs.existsSync(filePath))
                continue;

            const child = new Worker(filePath);
            this.processMap.set(p, child);

            child.on('error', (err) => {
                console.error(`${p} Worker encountered an unhandled error:`, err);
            });

            child.once('exit', (code) => {
                if (code !== 0) {
                    console.error(`${p} Worker stopped unexpectedly with exit code ${code}`);
                }
            });
        }
    }
}
