import { EventEmitter } from "node:events";
import type { AuthData } from '../../utils/types.js'
import { WebSocket as wsSocket } from "ws";
import { io } from "socket.io-client";

abstract class BasicAdapter extends EventEmitter {
    logEnabled: boolean = true;
    name?: string;
    authData?: AuthData;

    constructor() {
        super()
    }

    log(...args: string[]) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }

    error(...args: string[]) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }
}

export class Adapter extends BasicAdapter {
    static instance?: typeof Adapter;

    isAuthenticated: boolean = false;
    adapter?: any;

    constructor() {
        super();
        if (!['BreezeAdapter', 'KotakAdapter'].includes(this.constructor.name))
            throw new Error(this.constructor.name + ' cannot be instantiated outside of the parent-class.');
    }

    static getInstance<T extends Adapter>(this: new () => T): typeof Adapter {
        const targetclassdef = this as unknown as typeof Adapter;
        if (!targetclassdef.instance) {
            targetclassdef.instance = new this() as unknown as typeof Adapter;
        }
        return targetclassdef.instance;
    }
}

export abstract class Socket extends BasicAdapter {
    static instance?: typeof Socket;

    abstract onOpen(): void;
    abstract handleMessage(data: any): void;
    autoReconnect: boolean = true;
    maxRetries: number = 2;
    retryDelay: number = 2000;
    reconnectAttempts: number = 0;
    reconnectTimer: any = null;
    heartbeatInterval: number = 30000;
    heartbeatTimer: any = null;
    isConnecting: boolean = false;
    isConnected: boolean = false;
    url?: string;
    ws?: any;
    abstract type?: string;

    constructor() {
        super();
        if (!['HSIClient', 'KMDClient', 'TPSocket'].includes(this.constructor.name))
            throw new Error(this.constructor.name + ' cannot be instantiated outside of the parent-class.');
    }

    static getInstance<T extends Socket>(this: new () => T): typeof Socket {
        const targetclassdef = this as unknown as typeof Socket;
        if (!targetclassdef.instance) {
            targetclassdef.instance = new this() as unknown as typeof Socket;
        }
        return targetclassdef.instance;
    }

    async connect(url: string, type: string, autoreconnection: boolean = false) {
        if (this.isConnected || this.isConnecting) {
            this.log('Already connected or connecting');
            return;
        }
        this.isConnecting = true;
        return new Promise((resolve: any, reject: any) => {
            try {
                this.ws = this.newSocket(url, type);
                this.ws.addEventListener('open', () => {
                    this.isConnecting = false;
                    this.isConnected = true;
                    this.log('WebSocket connected');
                    this.onOpen();
                    this.emit('open', this.reconnectAttempts);
                    if (!autoreconnection)
                        this.reconnectAttempts = 0;
                    resolve();
                });

                this.ws.addEventListener('message', (event) => {
                    this.handleMessage(event);
                });

                this.ws.addEventListener('error', (error) => {
                    this.log('WebSocket error:', JSON.stringify(error));
                    this.emit('error', error);
                    if (!this.isConnected) {
                        this.isConnecting = false;
                        reject(error);
                    }
                });

                this.ws.addEventListener('close', (event) => {
                    this.log('WebSocket closed:', JSON.stringify(event));
                    this.isConnected = false;
                    this.isConnecting = false;
                    this.emit('close', event);
                    this.handleReconnect();
                });
            }
            catch (error: any) {
                this.isConnecting = false;
                this.log('WebSocket creation failed:', error.code + " " + error.message);
                reject(error.code + " " + error.message);
            }
        });
    }

    newSocket(url: string, type: string) {
        this.url = url;
        this.type = type;
        if (type === 'node')
            return new WebSocket(url);
        else if (type === 'ws')
            return new wsSocket(url);
        else if (type === 'socketio')
            return io(url, {
                auth: {
                    token: process.env.apiKey,
                    mode: 'TPCLIENT'
                },
                reconnection: true,
                timeout: 5000
            });
    }

    sendMessage(data) {
        if (!this.ws || !this.isConnected) {
            this.log('Cannot send message: not connected');
            return;
        }
        this.ws.send(data);
    }

    disconnect() {
        this.stopHeartbeat();
        this.clearReconnectTimer();
        if (this.ws) {
            this.ws.close(1000, 'Client disconnecting');
            this.ws = null;
        }
        this.autoReconnect = false;
        this.isConnected = false;
        this.isConnecting = false;
        this.emit('disconnected');
    }

    handleReconnect() {
        if (!this.autoReconnect)
            return;

        this.clearReconnectTimer();
        if (this.reconnectAttempts >= this.maxRetries) {
            this.log('Max reconnection attempts reached');
            this.emit('reconnect_failed');
            return;
        }
        this.reconnectAttempts++;
        const delay = this.retryDelay * Math.pow(2, this.reconnectAttempts - 1);
        this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxRetries})`);
        this.reconnectTimer = setTimeout(() => {
            this.log(`Reconnection attempt ${this.reconnectAttempts}`);
            this.emit('reconnecting', this.reconnectAttempts);
            this.connect(this.url!, this.type!, true).catch((err) => {
                this.log('Reconnection failed:', err);
            });
        }, delay);
    }

    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    sendHeartbeat() {
        if (this.ws && this.ws.readyState === 1)
            this.ws.ping();
        else
            this.handleReconnect();

    }

    startHeartbeat() {
        this.stopHeartbeat();
        if (this.heartbeatInterval > 0) {
            this.heartbeatTimer = setInterval(() => {
                this.sendHeartbeat();
            }, this.heartbeatInterval);
        }
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

    log(...args: string[]) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }

    error(...args: string[]) {
        if (this.logEnabled) {
            console.error(`[${this.name}]`, ...args);
        }
    }
}