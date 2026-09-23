import consoleStamp from 'console-stamp';
consoleStamp(console, { format: ':date(HH:MM:ss.l)' });

process.on('uncaughtException', (error) => {
    console.error('FATAL: Uncaught Exception ' +  error.stack);
    //setTimeout(() => process.exit(1), 5000); 
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise, reason ' + error.stack);
});

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function startServers() {
    const { SocketIO } = await import('./serverapps/socketio.mjs');
    (new SocketIO()).start();

    const { WSServer } = await import('./serverapps/socketws.mjs',);
    (new WSServer()).start();

}

await startServers();

function shutdown(signal) 
{
    setTimeout(() => {
        console.error("Forced shutdown due to timeout.");
        process.exit(1);
    }, 5000);

    console.log("All Socket.IO connections cleared and HTTP server closed.");
    process.exit(0);
}