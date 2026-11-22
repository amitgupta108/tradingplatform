import util from 'util';

// Helper function to generate H:M:S:ms timestamp
const getTimestamp = (): string => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `[${h}:${m}:${s}:${ms}]`;
};

// Map of standard console methods to patch
const methods = ['log', 'info', 'warn', 'error'] as const;

methods.forEach((method) => {
    // Capture the native machine logging method
    const original = console[method];

    console[method] = (message?: any, ...optionalParams: any[]) => {
        // 1. Format arguments exactly like standard Node.js console.log
        const formattedMessage = util.format(message, ...optionalParams);

        // 2. Prepend the simple H:M:S:ms timestamp
        const timestamp = getTimestamp();

        // 3. Send it out to the raw stream, preserving actual \n line breaks
        original.apply(console, [timestamp, formattedMessage]);
    };
});
process.on('uncaughtException', (error) => {
    console.error('FATAL: Uncaught Exception ' + error.stack);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise, reason ' + error);
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const apps: any[] = [];

async function startServers() {
    if (process.env.WEBAPP === 'Y') {
        const { SocketIO } = await import('./serverapps/socketio.js');
        apps.push(await (new SocketIO() as any).start());
    }

    if (process.env.SERVERAPP === 'Y') {
        const { WSServer } = await import('./serverapps/socketws.js');
        apps.push(await (new WSServer() as any).start());
    }

    if (process.env.SUBPROCESSES === 'Y') {
        const { SubProcessLauncher } = await import('./serverapps/process.js');
        apps.push(await (new SubProcessLauncher() as any).start());
    }
}

await startServers();

async function shutdown(signal) {
    setTimeout(() => {
        console.error("Forced shutdown due to timeout.");
        process.exit(1);
    }, 5000);

    try {
        for (const app of apps) {
            await app.tearDown();
        }
    } catch (exception) {
        console.error('Failed to tear down app ' + exception);
    }

    console.log("All Socket.IO connections cleared and HTTP server closed.");
    process.exit(0);
}