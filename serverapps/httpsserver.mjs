
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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

    let filePath = path.join(__dirname, '../web/', pathname);

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