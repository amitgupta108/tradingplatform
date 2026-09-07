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

const args = process.argv;
const port = args[2] === undefined ? 80 : Number(args[2]);
const host = process.env.HOST;

await startApp();

async function startApp()
{
    const io = await startServers(host, port);
    const app = await import('./serverlocal/app.mjs');

    io.on('connection', (s) => {
        app.connect(s);
    });
    app.startServices();
}

async function startServers(host, port) {
    const { socketServer } = await import('./serverapps/socketio.mjs', );
    return socketServer(host, port);
}

function shutdown(signal) 
{
    setTimeout(() => {
        console.error("Forced shutdown due to timeout.");
        process.exit(1);
    }, 5000);

    console.log("All Socket.IO connections cleared and HTTP server closed.");
    process.exit(0);
}