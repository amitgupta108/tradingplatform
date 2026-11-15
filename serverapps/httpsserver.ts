import { IncomingMessage, ServerResponse } from 'node:http';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

import { ConfigService } from '../serverlocal/service/config/configservice.mjs';
import type { AuthData } from '../serverlocal/utils/types.js';
import { DataApi } from '../serverlocal/api/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mimeTypes = {
    html: 'text/html',
    js: 'text/javascript',
    css: 'text/css',
    json: 'application/json',
    png: 'image/png'
};
const options = {
    key: fs.readFileSync(path.resolve(import.meta.dirname, process.env.ssl_key!)),
    cert: fs.readFileSync(path.resolve(import.meta.dirname, process.env.ssl_cert!)),
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3'
};

const args = process.argv;
let port = args[2] === undefined ? 80 : Number(args[2]);
if (port === undefined || port === 0 || port < 1025)
    port = Number(process.env.PORT1);

const host = process.env.HOST;

const allowedOrigins = [
    'http://localhost:1025', // Your live production frontend domain  
    'https://0.0.0.0:1030',               // Alternative local development port
    'https://localhost:1029'
];

export class WebServer {

    hServer: http.Server | https.Server | null = null;
    dataApi: DataApi | null = null;
    protocol: string | null = null;

    constructor() {
        this.protocol = process.env.HTTP === 'Y' ? 'http' : 'https';
    }

    init() {
        this.hServer = this.protocol === 'http' ? http.createServer((req, res) => {
            this.handleRequests(req, res);
        }) : https.createServer(options as any, (req, res) => {
            this.handleRequests(req, res);
        });

        this.hServer?.listen(port, host, () => {
            console.log(`Server running at ${this.protocol}://${host}:${port}/`);
        });

        this.dataApi = new DataApi()
    }

    handleRequests(req: IncomingMessage, res: ServerResponse) {
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

        // Prevent directory traversal attacks
        const parsedUrl = new URL(req.url as string, `https://${req.headers.host}`);
        let pathname = parsedUrl.pathname;

        if (req.method === 'OPTIONS')
            this.handleOptionsRequest(req, res)
        else if (pathname.startsWith('/redirect'))
            this.handleAuthRequest(parsedUrl, res);
        else if (pathname.startsWith('/api'))
            this.handleAPIRequest(req, res);
        else
            this.handleStaticRequest(pathname, res);
    }

    handleOptionsRequest(req: IncomingMessage, res: ServerResponse) {
        res.writeHead(204); // 204 No Content confirms parameters are accepted
        res.end();
    }

    handleStaticRequest(pathname: string, res: ServerResponse) {
        let filePath = path.join(__dirname, '../web/', pathname);
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

    handleAuthRequest(parsedUrl: URL, res: ServerResponse) {
        const authdata = { date: new Date().toDateString() } as AuthData;
        if (parsedUrl.pathname.endsWith('/fyers.html')) {
            authdata.provider = 'fyers'
            authdata.sid = parsedUrl.searchParams.get('auth_code') as string;
            //authdata.status = parsedUrl.searchParams.get('s');
            authdata.token = parsedUrl.searchParams.get('code') as string;
        }
        else if (parsedUrl.pathname.endsWith('/icici.html')) {
            authdata.provider = 'icici';
            authdata.date = new Date().toDateString();
            authdata.sid = parsedUrl.searchParams.get('apisession') as string;
        }
        const es = ConfigService.getServiceByName('EVENTSERVICE');
        es.emit('ext_auth', authdata);
        const responseType = 'text/html';
        res.writeHead(200, { 'Content-Type': responseType });
        res.end('<!DOCTYPE html><title>Redirect</title><label onclick="window.close()">X</label>', 'utf-8');
    }

    async handleAPIRequest(req: IncomingMessage, res: ServerResponse) {
        res.setHeader('Content-Type', 'application/json');
        const as = ConfigService.getServiceByName('AUTHSERVICE');
        const headers = req.headers;
        const profile = as.validate(headers['appid'], headers['mode']);

        if (profile === undefined) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Unauthorized' }));
        }
        else
            if (req.url === '/api/value' && req.method === 'POST') {
                const jsonbody = await this.getRequestBody(req) as { provider: string };
                const wrapper = await this.dataApi?.getValues(jsonbody?.provider);
                res.writeHead(200);
                res.end(JSON.stringify(wrapper));
            }
            else if (req.url === '/api/scrips' && req.method === 'POST') {
                const jsonbody = await this.getRequestBody(req) as { filters: any };
                const scrips = await this.dataApi?.getScrips(jsonbody?.filters);
                res.writeHead(200);
                res.end(JSON.stringify(scrips));
            }
    }

    getRequestBody(req: IncomingMessage) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', () => {
                try {
                    resolve(body ? JSON.parse(body) : {});
                } catch (err) {
                    reject(err);
                }
            });
        });
    }
}