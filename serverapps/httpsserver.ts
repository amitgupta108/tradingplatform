import { IncomingMessage, ServerResponse } from 'node:http';
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Generic } from '../common/generic.js';
import { WEB_ROOT_PATH, CERTS_PATH } from '../common/path.js';

const mimeTypes = {
    html: 'text/html',
    js: 'text/javascript',
    css: 'text/css',
    json: 'application/json',
    png: 'image/png'
};

const httpsOptions = {
    key: fs.readFileSync(path.join(CERTS_PATH, process.env.ssl_key!)),
    cert: fs.readFileSync(path.join(CERTS_PATH, process.env.ssl_cert!)),
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3'
};

const allowedOrigins = [
    'http://localhost:1025', // Your live production frontend domain  
    'https://0.0.0.0:1030',               // Alternative local development port
    'https://localhost:1029'
];

export class HTTPServer extends Generic {

    host: string;
    port: number;
    hServer: http.Server | https.Server | null = null;
    protocol: string | null = null;
    apiReqHandler?: (req: IncomingMessage, res: ServerResponse) => void;

    constructor(options?: any) {
        super('HTTPServer');
        this.host = options.host;
        this.port = options.port;
        this.protocol = options.protocol;

        this.hServer = this.protocol === 'http' ?
            http.createServer({}, (req, res) => {
                this.handleRequests(req, res)
            })
            : https.createServer(httpsOptions as any, (req, res) => {
                this.handleRequests(req, res)
            });

        this.hServer?.listen(this.port, this.host, () => {
            this.log(`Server running at ${this.protocol}://${this.host}:${this.port}/`);
        });
    }

    private handleRequests(req: IncomingMessage, res: ServerResponse) {
        const origin = req.headers.origin;

        if (origin && allowedOrigins.includes(origin)) {
            res.setHeader('Access-Control-Allow-Origin', origin);

            // CRITICAL: Set to true if you plan to transmit HTTP-Only session cookies or authorization tokens
            res.setHeader('Access-Control-Allow-Credentials', 'true');

            // Explicitly allow methods and headers required by your hybrid crypto mechanism
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

            // Cache the preflight response details in the browser for 10 minutes to save overhead
            res.setHeader('Access-Control-Max-Age', '600');
        }

        const parsedUrl = new URL(req.url as string, `https://${req.headers.host}`);
        let pathname = parsedUrl.pathname;

        if (req.method === 'OPTIONS')
            this.handleOptionsRequest(res)
        else if (pathname.startsWith('/v1/'))
            this.handleWebResRequest(pathname, res);
        else if (pathname.startsWith('/redirect'))
            this.apiReqHandler?.(req, res);
        else if (pathname.startsWith('/api'))
            this.apiReqHandler?.(req, res);
        else
            this.errorResponse(res)
    }

    handleOptionsRequest(res: ServerResponse) {
        res.writeHead(204); // 204 No Content confirms parameters are accepted
        res.end();
    }

    handleWebResRequest(pathname: string, res: ServerResponse) {
        let filePath = path.join(WEB_ROOT_PATH, pathname.replace('/v1/', ''));
        const ext = path.extname(filePath).toLowerCase().slice(1) as string;
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
    }

    setHandler(handlerFn: any) {
        this.apiReqHandler = handlerFn;
    }

    private errorResponse(res: ServerResponse) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
    }
}