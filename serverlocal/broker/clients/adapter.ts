import { EventEmitter } from "node:events";
import type { AuthData } from '../../utils/types.js'
import { WebSocket } from "ws";
import { ConfigService } from "../../service/config/configservice.mjs";
import type { NetworkProxy } from "../../utils/networkproxy.js";

abstract class BasicAdapter extends EventEmitter {
    logEnabled: boolean = true;
    name: string;
    provider: string;
    authData?: AuthData;
    isConnecting: boolean = false;
    isConnected: boolean = false;

    constructor(name: string, provider: string) {
        super();
        this.name = name;
        this.provider = provider;
    }
    abstract onAuthData(authData: AuthData): Promise<boolean>;

    async init() {
        const es = ConfigService.getServiceByName('EVENTSERVICE');
        es.addListener(`${this.provider}_auth`, async (authData: AuthData) => {
            if (!this.isConnected)
                await this.onAuthData(authData as AuthData);
        });

        const authservice = ConfigService.getServiceByName('AUTHSERVICE');
        const authData = await authservice.authdata(this.provider);

        await this.onAuthData(authData!);
    }

    log(...args: string[]) {
        if (this.logEnabled) {
            console.log(`[${this.name}]`, ...args);
        }
    }

    error(arg: string) {
        if (this.logEnabled) {
            console.error(`[${this.name}]`, arg);
        }
    }
}

export abstract class TPAdapter extends BasicAdapter {
    static instance?: typeof TPAdapter;

    constructor(name: string, provider: string) {
        super(name, provider);
        if (new.target.instance)
            throw new Error(this.constructor.name + ' cannot be instantiated using new. Use getInstance() method.');
    }

    static async getInstance<T extends TPAdapter>(this: new () => T): Promise<typeof TPAdapter> {
        const targetclassdef = this as unknown as typeof TPAdapter;
        try {
            if (!targetclassdef.instance) {
                targetclassdef.instance = new this() as unknown as typeof TPAdapter;
                await (targetclassdef.instance as any).init();
            }
            return targetclassdef.instance;
        } catch (error) {
            (targetclassdef.instance! as any).error('Error in TPAdapter getInstance: ' + error);
            throw error;
        }
    }
}

export abstract class TPSocket extends BasicAdapter {
    static instance?: typeof TPSocket;

    abstract onOpen(): void;
    abstract handleMessage(data: any, ...args: any[]): void;
    abstract subscribe(symbols: string[], action: string, ...args: any[]): void;
    autoReconnect: boolean = true;
    maxRetries: number = 5;
    retryDelay: number = 3000;
    reconnectAttempts: number = 0;
    reconnectTimer: any = null;
    heartbeatInterval: number = 30000;
    heartbeatTimer: any = null;
    url?: string;
    ws?: WebSocket | NetworkProxy;

    constructor(name: string, provider: string) {
        super(name, provider);
        if (new.target.instance)
            throw new Error(this.constructor.name + ' cannot be instantiated using new. Use getInstance() method.');
    }

    static async getInstance<T extends TPSocket>(this: new () => T): Promise<typeof TPSocket> {
        const targetclassdef = this as unknown as typeof TPSocket;
        try {
            if (!targetclassdef.instance) {
                targetclassdef.instance = new this() as unknown as typeof TPSocket;
                await (targetclassdef.instance as any).init();
            }
            return targetclassdef.instance;
        } catch (error) {
            (targetclassdef.instance! as any).error('Error in TPSocket getInstance: ' + error);
            throw error;
        }
    }

    async connect(url: string, autoreconnection: boolean = false) {
        if (this.isConnected || this.isConnecting) {
            this.log('Already connected or connecting');
            return;
        }
        this.isConnecting = true;
        return new Promise((resolve: any, reject: any) => {
            try {
                this.ws = new WebSocket(url);
                this.ws.addEventListener('open', () => {
                    this.isConnecting = false;
                    this.isConnected = true;
                    this.url = url;
                    this.log('WebSocket connected');
                    this.onOpen();
                    this.emit('open', this.reconnectAttempts);
                    if (!autoreconnection)
                        this.reconnectAttempts = 0;
                    resolve();
                });

                this.ws.addEventListener('message', (event: any) => {
                    this.handleMessage(event);
                });

                this.ws.addEventListener('error', (error) => {
                    this.log('WebSocket error:', JSON.stringify(error));
                    this.emit('error', error);
                    this.onError(error);
                    this.isConnecting = false;
                });

                this.ws.addEventListener('close', (event: any) => {
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

    sendMessage(data: any) {
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
        }
        this.autoReconnect = false;
        this.isConnected = false;
        this.isConnecting = false;
        this.emit('disconnected');
    }

    onError(error: any) {
        this.error(`Error in ${this.name} - ${JSON.stringify(error)}`);
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
            this.connect(this.url!, true).catch((err) => {
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
        this.reconnectAttempts = 0;
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
}