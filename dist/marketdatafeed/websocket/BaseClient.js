import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { Keys } from '../types/types.js';
import { encodeData } from '../utils/compression.js';
import { PacketParser } from '../protocol/PacketParser.js';
import { PacketBuilder } from '../protocol/PacketBuilder.js';
import { buf2Long} from '../utils/binary.js';
import { BinRespTypes } from '../types/types.js';

/**
 * Base WebSocket client for Kotak Securities market data.
 * Provides connection management, reconnection, heartbeat, and message routing.
 */
class BaseClient extends EventEmitter {
    constructor(url, options) {
        super();
        this.ws = null;
        this.ackObj = { ackNum: 0, counter: 0};
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.isConnecting = false;
        this.isConnected = false;
        this.url = url;
        this.options = {
            ...options,
            autoReconnect: options.autoReconnect ?? true,
            maxRetries: options.maxRetries ?? 5,
            retryDelay: options.retryDelay ?? 3000,
            heartbeatInterval: options.heartbeatInterval ?? 10000,
            throttleInterval: options.throttleInterval ?? 30000,
            logEnabled: options.logEnabled ?? true,
        };
        this.topicList = {};
    }
    /**
     * Connect to the WebSocket server.
     */
    async connect() {
        if (this.isConnected || this.isConnecting) {
            this.log('Already connected or connecting');
            return;
        }
        this.isConnecting = true;
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
                this.ws.binaryType = 'arraybuffer';
                this.ws.onopen = () => {
                    this.isConnecting = false;
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.log('WebSocket connected');
                    this.onOpen();
                    this.startHeartbeat();
                    this.emit('open');
                    resolve();
                };
                this.ws.onmessage = (event) => {
                    this.handleMessage(event.data);
                };
                this.ws.onerror = (error) => {
                    this.log('WebSocket error:', error.message);
                    this.emit('error', error);
                    if (!this.isConnected) {
                        this.isConnecting = false;
                        reject(error);
                    }
                };
                this.ws.onclose = (event) => {
                    this.log('WebSocket closed:', event.code, event.reason);
                    this.isConnected = false;
                    this.isConnecting = false;
                    this.stopHeartbeat();
                    this.emit('close', event);
                    this.handleReconnect();
                };
            }
            catch (error) {
                this.isConnecting = false;
                this.log('WebSocket creation failed:', error);
                reject(error);
            }
        });
    }
    /**
     * Disconnect from the WebSocket server.
     */
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
    /**
     * Send a JSON request to the server (compressed).
     */
    sendRequest(type, payload) {
        if (!this.ws || !this.isConnected) {
            this.log('Cannot send request: not connected');
            return;
        }
        const request = { [Keys.TYPE]: type, ...payload };
        const encoded = encodeData(JSON.stringify(request));
        this.ws.send(encoded);
    }

    sendMessage(data) {
        if (!this.ws || !this.isConnected) {
            this.log('Cannot send message: not connected');
            return;
        }
        this.ws.send(data);
    }

    handleMessage(data, t) {
        try {
            if (data instanceof ArrayBuffer) {
                const resp = PacketParser.init(data); 
                if (resp.responseType === BinRespTypes.DATA_TYPE)
                    this.someAcknowledgementBusiness(data, resp);

                let jsonData = PacketParser.parseData(data, resp, this.topicList);
                if (resp.responseType === BinRespTypes.CONNECTION_TYPE
                    && jsonData.ackCount !== undefined) 
                {
                    this.ackObj.ackNum = jsonData.ackCount;
                    jsonData = jsonData.resp;
                }
                this.handleBinaryMessage(jsonData, resp.responseType, t);
            } 
            else if (typeof data === 'string') {
                const parsed = PacketParser.parseTextMessage(data);
                this.handleTextMessage(parsed);
            }
            else {
                this.log('unknown', 'Unknown DataType');
            }
        }
        catch (error) {
            this.log('Error handling message:', error);
        }
    }

    someAcknowledgementBusiness(data, resp)
    {
        let msgNum = 0;
        if (this.ackObj.ackNum > 0) {
            ++this.ackObj.counter;
            msgNum = buf2Long(data.slice(resp.position, resp.position + 4));
            resp.position += 4;
            if (this.ackObj.counter === this.ackObj.ackNum) {
                const req = PacketBuilder.buildAcknowledgementRequest(msgNum);
                this.sendMessage(req);                
                this.ackObj.counter = 0;
            }
        }
    }
    /**
     * Start the heartbeat interval to keep the connection alive.
     */
    startHeartbeat() {
        this.stopHeartbeat();
        if (this.options.heartbeatInterval > 0) {
            this.heartbeatTimer = setInterval(() => {
                this.sendHeartbeat();
            }, this.options.heartbeatInterval);
        }
    }
    /**
     * Stop the heartbeat interval.
     */
    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    /**
     * Handle reconnection logic.
     */
    handleReconnect() {
        if (!this.options.autoReconnect)
            return;
        this.clearReconnectTimer();
        if (this.reconnectAttempts >= this.options.maxRetries) {
            this.log('Max reconnection attempts reached');
            this.emit('reconnect_failed');
            return;
        }
        this.reconnectAttempts++;
        const delay = this.options.retryDelay * Math.pow(2, this.reconnectAttempts - 1);
        this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.options.maxRetries})`);
        this.reconnectTimer = setTimeout(() => {
            this.log(`Reconnection attempt ${this.reconnectAttempts}`);
            this.emit('reconnecting', this.reconnectAttempts);
            this.connect().catch((err) => {
                this.log('Reconnection failed:', err);
            });
        }, delay);
    }
    /**
     * Clear the reconnect timer.
     */
    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }
    /**
     * Log a message if logging is enabled.
     */
    log(...args) {
        if (this.options.logEnabled) {
            console.log(`[KotakWS]`, ...args);
        }
    }
}
export { BaseClient };