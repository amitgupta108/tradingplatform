import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path'; 

import { eventservice } from '../serverlocal/service/system/eventservice.mjs';
import { ConfigService } from '../serverlocal/service/.config/configservice.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png'
};
const options = {
    key: fs.readFileSync(path.resolve(import.meta.dirname, process.env.ssl_key)),
    cert: fs.readFileSync(path.resolve(import.meta.dirname, process.env.ssl_cert)),
    minVersion: 'TLSv1.2',
    maxVersion: 'TLSv1.3'
};

const args = process.argv;
const port = args[2] === undefined ? 80 : Number(args[2]);
const host = process.env.HOST;

const httpServer = http.createServer({}, handleRequests);
const httpsServer = https.createServer(options, handleRequests);

export const hServer = process.env.HTTP === 'Y' ? httpServer : httpsServer;
const protocol = process.env.HTTP === 'Y' ? 'http' : 'https';
if (port === undefined || port === 0 || port < 1025)
    port = process.env.PORT1;

hServer.listen(port, host, () => {
    console.log(`Server running at ${protocol}://${host}:${port}/`);
});

const allowedOrigins = [
    'http://localhost:1025', // Your live production frontend domain  
    'https://0.0.0.0:1030',               // Alternative local development port
];

function handleRequests(req, res) 
{
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) 
    {
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
    const parsedUrl = new URL(req.url, `https://${req.headers.host}`);
    let pathname = parsedUrl.pathname;

    if (req.method === 'OPTIONS') 
        handleOptionsRequest(req, res)
    else if(pathname.startsWith('/redirect'))
        handleAuthReq(parsedUrl, res);
    else if (pathname.startsWith('/api'))
        handleAPIReq(req, res);
    else
        handleStaticReq(parsedUrl, res);
}

function handleOptionsRequest(req, res)
{
    res.writeHead(204); // 204 No Content confirms parameters are accepted
    res.end();
}

function handleStaticReq(parsedUrl, res)
{
    let filePath = path.join(__dirname, '../web/', parsedUrl.pathname);
    const ext = path.extname(filePath);
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

function handleAuthReq(parsedUrl, res)
{
    const authdata = {date: new Date().toDateString()};
    if(parsedUrl.pathname.endsWith('/fyers.html'))
    {    
        authdata.provider = 'fyers'
        authdata.authcode = parsedUrl.searchParams.get('auth_code');
        authdata.status = parsedUrl.searchParams.get('s');
        authdata.code = parsedUrl.searchParams.get('code');
    }
    else if(parsedUrl.pathname.endsWith('/icici.html'))
    {
        authdata.provider = 'icici';
        authdata.authcode = parsedUrl.searchParams.get('apisession');        
    }        
    eventservice.emit('ext_auth', authdata);
    const responseType = 'text/html';
    res.writeHead(200, { 'Content-Type': responseType });
    res.end('<!DOCTYPE html><title>Redirect</title><label onclick="window.close()">X</label>', 'utf-8');
}

async function handleAPIReq(req, res)
{
    res.setHeader('Content-Type', 'application/json');

    if (req.url === '/api/value' && req.method === 'POST')
    {
        const body = await getRequestBody(req);
        const provider = body.provider;
        const key = body.key;

        const as = ConfigService.getServiceByName('AUTHSERVICE');
        const wrapper = await as.value(provider, key);
        res.writeHead(200);
        res.end(JSON.stringify(wrapper));
    }
}

function getRequestBody(req)
{
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
};