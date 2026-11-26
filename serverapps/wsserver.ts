import { WebSocketServer } from 'ws';

export class WSServer {
    wss: WebSocketServer;
    socketmap: Map<string, any> = new Map();

    constructor(options?: any) {
        this.wss = new WebSocketServer({ port: Number(options.port) });
        console.log('WebSocket server is running on ws://localhost:' + options.port);
    }
}