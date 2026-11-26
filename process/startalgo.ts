import { Logger } from '../common/logger.js';
import { parentPort } from "node:worker_threads";

export const algotype = 'ORDERBASED';
export const algoname = 'ORDERSL';
export const instance = 1;

process.on('uncaughtException', (error: Error) => {
    console.error('FATAL: Uncaught Exception ' + error.stack);
    //setTimeout(() => process.exit(1), 5000); 
});

process.on('unhandledRejection', (error: Error) => {
    console.error('Unhandled promise, reason ' + error.stack);
});

async function startServers() {
    const { ProcessApp } = await import('../apps/workerapp.js');
    const algoapp = new ProcessApp('ALGOTHREAD');
    algoapp.initport = parentPort!;

    parentPort!.on('message', (message: any) => {
        if (message.type === 'connection') {
            algoapp.connect(message.port, message.id);
        }
    });
    await algoapp.startServices(['EVENTSERVICE', 'ALGOINTERFACE']);

    const { ServerApp } = await import('../apps/serverapp.js');
    await (new ServerApp('algo')).init();
}

await startServers();