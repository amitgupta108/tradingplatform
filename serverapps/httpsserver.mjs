
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path'; 

import { eventservice } from '../serverlocal/service/eventservice.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png'
};
/*
const options = {
    key: fs.readFileSync(path.join(__dirname, '..', 'serverlocal', 'config', 'server.key'), 'utf8'),
    cert: fs.readFileSync(path.join(__dirname, '..', 'serverlocal', 'config', 'server.crt'), 'utf8'),
};
*/
export const httpServer = http.createServer({}, (req, res) => {
    
    // Prevent directory traversal attacks
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let pathname = parsedUrl.pathname; 

    if(pathname.startsWith('/redirect'))
        handleAuthReq(parsedUrl, res)
    else 
        handleStaticReq(parsedUrl, res);
});

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
    const authdata = {date: new Date().toString()};
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
    res.end('<!DOCTYPE html><title>C</title><label onclick="window.close()">X</label>', 'utf-8');
}