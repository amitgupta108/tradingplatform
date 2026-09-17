import { EventEmitter } from 'events';
import WebSocket from 'ws';

import { BinRespTypes, RespTypeValues, STAT, SCRIP_PREFIX, INDEX_PREFIX, RespTypes } from '../../../dist/marketdatafeed/constants/types.js';
import { PacketBuilder } from '../../../dist/marketdatafeed/protocol/PacketBuilder.js';
import { PacketParser } from '../../../dist/marketdatafeed/protocol/PacketParser.js';
import { buf2Long } from '../../../dist/marketdatafeed/utils/binary.js';

const HSM_URL = 'wss://mlhsm.kotaksecurities.com';

export class HSMClient extends EventEmitter
{
    constructor(options) {
        super();
        this.ws = null;
        this.ackObj = { ackNum: 0, counter: 0};
        this.shouldReconnect = true;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.isConnecting = false;
        this.isConnected = false;
        this.url = HSM_URL;
        this.options = {
            ...options,
            autoReconnect: options.autoReconnect ?? true,
            maxRetries: options.maxRetries ?? 5,
            retryDelay: options.retryDelay ?? 3000,
            heartbeatInterval: options.heartbeatInterval ?? 10000,
            throttleInterval: options.throttleInterval ?? 30000,
            logEnabled: options.logEnabled ?? true,
            encoded: options.encoded ?? false
        };
        this.topicList = {};
        this.channel = '1';
        this.authData = null;
        this.throttleIntId;
    }

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

    sendMessage(data) {
        if (!this.ws || !this.isConnected) {
            this.log('Cannot send message: not connected');
            return;
        }
        this.ws.send(data);
    }

    handleMessage(data) {
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
                this.handleBinaryMessage(jsonData, resp.responseType);
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
            msgNum = buf2Long(data, resp.position, 4);
            resp.position += 4;
            if (this.ackObj.counter === this.ackObj.ackNum) {
                const req = PacketBuilder.buildAcknowledgementRequest(msgNum);
                this.sendMessage(req);                
                this.ackObj.counter = 0;
            }
        }
    }

    initiateConnect(authData)
    {
        this.authData = authData;
        this.connect();
    }

    onOpen() {
        this.authenticate();
    }
    
    authenticate() {
        const authPayload = PacketBuilder.buildConnection(this.authData.hsm_token, this.authData.hsm_sid);
        this.sendMessage(authPayload);
        this.log('Authentication request sent');
    }

    handleBinaryMessage(message, responseType) 
    {
        if (responseType === BinRespTypes.DATA_TYPE)
            message.forEach((item) => {
                this.emit(item.type === RespTypes.UPDATE ? 'quote' : 'snapshot', item.data);
            });
        else
            this.handleConfirmations(message);
    }

    handleConfirmations(parsed)
    {
        if(parsed.type === RespTypeValues.CONN) 
        {
            if (parsed.stat === STAT.OK)
                this.throttleIntId = setInterval(() => {
                    this.requestThrottling('');
                }, this.options.throttleInterval);
            else
                this.log('HSM authentication failed:', parsed.msg);
        }
        else if (parsed.type === RespTypeValues.SUBS)
            this.log('subscribed', parsed);
        else if (parsed.type === RespTypeValues.UNSUBS)
            this.log('unsubscribed', parsed);
        else if (parsed.type === RespTypeValues.SNAP)
            this.log('snapshot', parsed);
        else
            this.log('heart beat');
    }

    handleTopicMessage(parsed) 
    {
        if (parsed.topicData) {
            const topicData = parsed.topicData;
            this.emit('topic', topicData.topic, topicData.getData());
            if (parsed.respType === 6) {
                this.emit('update', topicData.topic, topicData.getData());
            }
            else if (parsed.respType === 9) {
                this.emit('snapshot_data', topicData.topic, topicData.getData());
            }
        }
        if (parsed.message) {
            this.emit('info', parsed.message);
        }
    }
    
    startHeartbeat() {
        this.stopHeartbeat();
        if (this.options.heartbeatInterval > 0) {
            this.heartbeatTimer = setInterval(() => {
                this.sendHeartbeat();
            }, this.options.heartbeatInterval);
        }
    }

    stopHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }

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

    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    log(...args) {
        if (this.options.logEnabled) {
            console.log(`[KotakHSM]`, ...args);
        }
    }

    // ==================== PUBLIC API ====================
    subscribe(scrips, type, action, notreq) {
        const scripStr = Array.isArray(scrips) ? scrips.join('&') : scrips;
        action = action === 'subs' ? BinRespTypes.SUBSCRIBE_TYPE : BinRespTypes.UNSUBSCRIBE_TYPE;
        type = type === 'Scrips' ? SCRIP_PREFIX : INDEX_PREFIX;
        const request = PacketBuilder.buildSubsRequest(scripStr.replaceAll('NIFTY', 'Nifty'), action, type, this.channel);
        this.sendMessage(request);
        this.log('Subscribing to scrips:', scripStr.replaceAll('NIFTY', 'Nifty'));
    }

    requestIndexSnapshot(scrips) {
        const scripStr = Array.isArray(scrips) ? scrips.join('&') : scrips;
        this.log('Requesting index snapshot:', scripStr);
        const request = PacketBuilder.buildSnapshotRequest(scripStr, BinRespTypes.SNAPSHOT, INDEX_PREFIX);
        this.sendMessage(request);
    }

    requestScripSnapshot(scrips) {
        const scripStr = Array.isArray(scrips) ? scrips.join('&') : scrips;
        this.log('Requesting scrip snapshot:', scripStr);
        const request = PacketBuilder.buildSnapshotRequest(scripStr, BinRespTypes.SNAPSHOT, SCRIP_PREFIX);
        this.sendMessage(request);
    }

    requestThrottling(scrips) {
        const request = PacketBuilder.buildThrottlingRequest(scrips);
        this.sendMessage(request);
    }

    sendHeartbeat() {
        if (this.ws && this.isConnected) {
            this.ws.ping();
        }
    }




}