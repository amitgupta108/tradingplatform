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