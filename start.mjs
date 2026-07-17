import consoleStamp from 'console-stamp';
consoleStamp(console, { format: ':date(HH:MM:ss.l)' });

import https from 'node:https';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { Server } from "socket.io";
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

const options = {
    key: fs.readFileSync(path.join(__dirname, 'serverlocal', 'config', 'server.key'), 'utf8'),
    cert: fs.readFileSync(path.join(__dirname, 'serverlocal', 'config', 'server.crt'), 'utf8'),
};

const httpsServer = https.createServer(options, (req, res) => {
    // Prevent directory traversal attacks
    const parsedUrl = new URL(req.url, `https://${req.headers.host}`);
    let pathname = parsedUrl.pathname; 

    let filePath = path.join(__dirname, 'web', pathname === '/' ? 'static/positions.html' : pathname);

    const ext = path.extname(filePath);
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png'
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

const io = new Server(httpsServer, {
    cors: {
        origin: `https://localhost:${port}`,
        methods: ["GET", "POST"],
    },
    connectionStateRecovery: {
        maxDisconnectionDuration: 3 * 60 * 1000,
        skipMiddlewares: true,
    },
    pingInterval: 30000,
    pingTimeout: 30000
});

httpsServer.listen(port, () => {
    console.log(`Server running at https://127.0.0.1:${port}/`);
});

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
    io.close(() => {
        console.log("All Socket.IO connections cleared and HTTP server closed.");

        process.exit(0);
    });

    setTimeout(() => {
        console.error("Forced shutdown due to timeout.");
        process.exit(1);
    }, 5000);
}