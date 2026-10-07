import { io } from 'socket.io-client';
import {WebSocket as wsSocket} from 'ws';
import EventEmitter from "node:events";

export class BrokerAdapter extends EventEmitter
{
    constructor(name, options)
    {
        super();
        this.name = name;
        this.autoReconnect = options.autoReconnect ?? true;
        this.maxRetries = options.maxRetries ?? 2;
        this.retryDelay = options.retryDelay ?? 2000;
        this.heartbeatInterval = options.heartbeatInterval ?? 30000;
        this.logEnabled = options.logEnabled ?? true;
        this.heartbeatTimer = null;
        this.isConnecting = false;
        this.isConnected = false;
        this.url;
        this.authData;
        this.ws;
        this.type;
    }

    async connect(url, type) {
        if (this.isConnected || this.isConnecting) {
            this.log('Already connected or connecting');
            return;
        }
        this.isConnecting = true;
        return new Promise((resolve, reject) => {
            try {
                this.ws = this.newSocket(url, type);
                this.ws.addEventListener('open', () => {
                    this.isConnecting = false;
                    this.isConnected = true;
                    this.log('WebSocket connected');
                    this.onOpen();
                    this.emit('open', this.reconnectAttempts);
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

                this.ws.addEventListener('close',  (event) => {
                    this.log('WebSocket closed:', JSON.stringify(event));
                    this.isConnected = false;
                    this.isConnecting = false;
                    this.emit('close', event);
                    this.handleReconnect();
                });
            }
            catch (error) {
                this.isConnecting = false;
                this.log('WebSocket creation failed:', error.code + " " + error.message);
                reject(error.code + " " + error.message);
            }
        });
    }
 
    newSocket(url, type)
    {
        this.url = url;
        this.type = type;
        if(type === 'node')
            return new WebSocket(url);
        else if( type === 'ws')
            return new wsSocket(url);
        else if(type === 'socketio')
            return io(url, {
                auth: {
                    token: this.authData.appid,
                    mode: this.authData.mode,
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
        this.shouldReconnect = false;
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
            this.connect(this.url, this.type).catch((err) => {
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
        if (this.ws && this.isConnected) {
            this.ws.ping();
        }
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

    log(...args) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }
}