import util from 'util';
// Helper function to generate H:M:S:ms timestamp
const getTimestamp = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    return `[${h}:${m}:${s}:${ms}]`;
};
// Map of standard console methods to patch
const methods = ['log', 'info', 'warn', 'error'];
methods.forEach((method) => {
    // Capture the native machine logging method
    const original = console[method];
    console[method] = (message, ...optionalParams) => {
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
    //setTimeout(() => process.exit(1), 5000); 
});
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise, reason ' + error.stack);
});
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
async function startServers() {
    const { SocketIO } = await import('./serverapps/socketio.mjs');
    await (new SocketIO()).start();
    const { WSServer } = await import('./serverapps/socketws.mjs');
    await (new WSServer()).start();
}
await startServers();
function shutdown(signal) {
    setTimeout(() => {
        console.error("Forced shutdown due to timeout.");
        process.exit(1);
    }, 5000);
    console.log("All Socket.IO connections cleared and HTTP server closed.");
    process.exit(0);
}
