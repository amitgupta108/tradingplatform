import { Logger } from '../utils/logger.js';
import { parentPort } from "node:worker_threads";

process.on('uncaughtException', (error: Error) => {
    console.error('FATAL: Uncaught Exception ' + error.stack);
    //setTimeout(() => process.exit(1), 5000); 
});

process.on('unhandledRejection', (error: Error) => {
    console.error('Unhandled promise, reason ' + error.stack);
});

async function startServers() {
    const { AlgoApp } = await import('../apps/algoapp.js');
    const algoapp = new AlgoApp(parentPort!);

    const { WSServer } = await import('../serverapps/socketws.js');
    await (new WSServer()).start(algoapp);
}

await startServers();