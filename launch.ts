import { Logger } from './common/logger.js';
import { SocketIO, WSServer, SubProcessLauncher } from './common/import.js';

process.on('uncaughtException', (error) => {
    Logger.error('FATAL: Uncaught Exception ' + error.stack);
});

process.on('unhandledRejection', (error) => {
    Logger.error('Unhandled promise, reason ' + error);
});

process.on("SIGTERM", () => Launcher.shutdown("SIGTERM"));
process.on("SIGINT", () => Launcher.shutdown("SIGINT"));

const host = process.env.HOST;
const httpport = process.env.PORT_HTTP;
const httpsport = process.env.PORT_HTTPS;
const wsport = process.env.PORT_WS;

export class Launcher {
    static apps: Array<any> = [];
    static counter = 0;

    static async launch(): Promise<number> {
        if (process.env.WEBHTTP === 'Y') {
            const { WebApp } = await import('./apps/webapp.js');
            const app_1 = new WebApp("WEBHTTP") as any;
            this.apps.push(app_1);
            await app_1.init(this.sioserver(false));
            this.counter++;
        }

        if (process.env.WEBHTTPS === 'Y') {
            const { WebApp } = await import('./apps/webapp.js');
            const app_2 = new WebApp("WEBHTTPS") as any;
            await app_2.init(this.sioserver(true));
            this.counter++;
        }

        if (process.env.SERVERAPP === 'Y') {
            const { ServerApp } = await import('./apps/serverapp.js');
            await (new ServerApp("SERVERAPP") as any).init();
            this.counter++;
        }

        if (process.env.SUBPROCESSES === 'Y') {
            const { ProcessApp } = await import('./apps/workerapp.js');
            await (new ProcessApp('PROCESSES_1') as any).start();
            this.counter++;
        }

        return this.counter;
    }

    static sioserver(https: boolean): SocketIO {
        return new SocketIO({
            host: host, port: https ? httpsport : httpport,
            protocol: https ? 'https' : 'http'
        });
    }

    static wsserver(): WSServer {
        return new WSServer({ host: host, port: Number(wsport) });
    }

    static processserver(): void { }

    static async shutdown(signal: string) {
        Logger.log("Shutdown request for ");

        setTimeout(() => {
            console.error("Forced shutdown due to timeout.");
            process.exit(1);
        }, 5000);

        try {
            for (const app of this.apps) {
                await app.tearDown();
            }
        } catch (exception) {
            console.error('Failed to tear down app ' + exception);
        }
        console.log("All Socket.IO connections cleared and HTTP server closed.");
        process.exit(0);
    }
}

Launcher.launch()
    .then((count: number) => Logger.log('applications launched successfully ' + count))
    .catch(err => Logger.error('Failed to launch apps ' + err));