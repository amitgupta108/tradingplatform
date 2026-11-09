
import { Worker } from 'node:worker_threads';
import { resolve } from 'node:path';

class WorkerHandle {
    constructor(path) {
        const workerPath = resolve(path, 'index.js');
        this.worker = new Worker(workerPath);

        this.worker.on('message', ({ success, result, error }) => {
            if (success) {
                this.resolve(result);
            } else {
                this.reject(new Error(error));
            }
        });

        this.worker.on('error', (err) => {
            console.error('Worker thread critical error:', err);
        });
    }
}