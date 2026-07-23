import consoleStamp from 'console-stamp';
consoleStamp(console, { format: ':date(HH:MM:ss.l)' });

import { socketio } from './serverapps/socketio.mjs';
import { startUWS, stopUWS } from './serverapps/uwebsocket.mjs';
import { hot } from 'hot-hook';

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
console.log(`First argument: ${args[2]}`);
const port = args[2] === undefined ? 80 : Number(args[2]);

const io = socketio(port);
//const servertoken = startUWS(8080);

let app = await import('./serverlocal/app.mjs', import.meta.hot?.boundary);
app.default.startServices();

io.on('connection', (s) => {

    s.on('reload', async () => {
        try {
            if (import.meta.hot) {
                app = await import('./serverlocal/app.mjs', import.meta.hot?.boundary);
                app.default.startServices();
                console.log('[HMR] Swap completed successfully.');
            }
        } catch (err) {
            console.log('[HMR] Reload aborted: ' + err.message);
        }
    });

    app.default.connect(s)
});


function shutdown(signal) 
{
//    if (serverToken) {
//        stopUWS(servertoken);
//    }

    io.close(() => {
        console.log("All Socket.IO connections cleared and HTTP server closed.");
        process.exit(0);
    });

    setTimeout(() => {
        console.error("Forced shutdown due to timeout.");
        process.exit(1);
    }, 5000);
}