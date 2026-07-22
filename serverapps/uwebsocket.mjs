import uWS from 'uWebSockets.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { uwsmap } from '../serverlocal/session/appstate.mjs';
import { decode, encode } from '@msgpack/msgpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to convert ArrayBuffer from uWS to a readable String
const decoder = new TextDecoder('utf-8');

const sslOptions = {
    key_file_name: path.resolve(__dirname, 'config/localhost.key'),
    cert_file_name: path.resolve(__dirname, 'config/localhost.crt'),
    passphrase: process.env.SSL_PASSPHRASE
};

function getQueryParams(req) {
    const query = req.getQuery(); // e.g., "token=xyz&user=123"
    const params = new URLSearchParams(query);
    return Object.fromEntries(params.entries());
}

const serveroptions = {
    /* Configuration options */
    compression: uWS.SHARED_COMPRESSOR,
    maxPayloadLength: 16 * 1024, // 16kb limit

    // Upgrade hook: set up initial user state
    upgrade: (res, req, context) => {
        const user = getQueryParams(req);

        res.upgrade(
            user, // This is the 'userData' object
            req.getHeader('sec-websocket-key'),
            req.getHeader('sec-websocket-protocol'),
            req.getHeader('sec-websocket-extensions'),
            context
        );
    },

    open: (ws) => {
        const profile = ws.getUserData();
        console.log('A client connected directly. ' + JSON.stringify(profile));
        uwsmap.set(profile.appid, ws);
        //ws.send(encode('Welcome directly to the server!'), true);

    },

    message: (ws, message, isBinary) => {
        const textMessage = decoder.decode(message);
        console.log(`Received message: ${textMessage}`);

        //  ws.send(encode(`Server received: ${textMessage}`), true);
    },
    
    close: (ws, code, message) => {
        console.log('Client disconnected.');
    }
};

export const startUWS = (port) => {
    const uwserver = uWS.SSLApp(sslOptions).ws('/*', serveroptions);
    let servertoken;
    uwserver.listen(port, (token) => {
        
        if (token) {
            servertoken = token;
            console.log('uWebSockets.js server listening on port 8080');
        } else {
            console.log('Failed to start uWebSockets.js server.');
        }
    });
    return servertoken;
 }

export function stopUWS(servertoken)
 {
    uWS.us_listen_socket_close(servertoken);
     console.log("Stopped accepting new connections.");
 }