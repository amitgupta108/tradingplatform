import { EventEmitter } from 'events';
import { PacketParser } from '../../../common/PacketParser.mjs';

const KDM_URL = 'wss://sfeed.kotaksecurities.com';

export class KMDClient extends EventEmitter 
{
    constructor(options) {
        super();
        this.autoReconnect = options.autoReconnect ?? false;
        this.maxRetries = options.maxRetries ?? 2;
        this.retryDelay = options.retryDelay ?? 3000;
        this.logEnabled = options.logEnabled ?? true;
        this.isConnecting = false;
        this.isConnected = false;
        this.ws = null;
        this.authData = null;
        this.dividers = null;
    }

    async connect(url) {
        if (this.isConnected || this.isConnecting) {
            this.log('Already connected or connecting');
            return;
        }
        this.isConnecting = true;
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(url);
                this.ws.binaryType = 'arraybuffer';
                this.ws.onopen = () => {
                    this.isConnecting = false;
                    this.isConnected = true;
                    this.reconnectAttempts = 0;
                    this.log('WebSocket connected');
                    this.onOpen();
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
                    this.emit('close', event.code);
                    this.handleReconnect();
                };
            }
            catch (error) {
                this.isConnecting = false;
                this.log('WebSocket creation failed:', error.code + " " + error.message);
                reject(error.code + " " + error.message);
            }
        });
    }

    initiateConnect(authData) {
        this.authData = authData;
        return this.connect(this.authData.feedUrl);
    }

    onOpen() {
        this.authenticate();
    }

    authenticate() {
        const authPayload = {
            user: process.env.kotak_ucc,
            auth: this.authData.hsi_sid,
            format: 'native_batch',
            source: 'NEOTRADEAPI',
        }
        this.sendMessage(JSON.stringify(authPayload));
        this.log('Authentication request sent');
    }

    disconnect() {
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
            if (typeof data !== 'string' && data instanceof ArrayBuffer) {
                const packets = PacketParser.splitBatch(Buffer.from(data));
                for (const packet of packets) {
                    const message = PacketParser.decodePacket(packet, this.dividers);
                    if (message)
                        this.handleResponse(message);
                }
                return;
            }
            const input = typeof data === 'string' ? data : data.toString('utf8');
            this.handleResponse(JSON.parse(input));
        }
        catch (error) {
            this.log('Error handling message:', error);
        }
    }

    handleResponse(parsed)
    {
        if (parsed?.type === 'scrip')
            this.emit('quote', parsed);
        else if (parsed.message_code === 1117 || parsed.message_code === 1119)
            this.dividers = parsed.exchanges;
        else
            this.log('Parsed message:', JSON.stringify(parsed));
    }

    handleConfirmations(parsed)
    {
        this.log(parsed);
    }
    
    // ==================== PUBLIC API ====================
    snapshot(scrips, type = '', lite = false) {
        const scripStr = Array.isArray(scrips) ? scrips.join(',') : scrips;
        this.log('Requesting scrip snapshot:', scripStr);
        const request = {
            event: 'snapshot' + type + (lite ? 'Lite' : ''),
            inputtoken: scripStr,
        }
        this.sendMessage(JSON.stringify(request));
    }

    subscribe(scrips, type = '', action, lite = false) {
        const scripStr = Array.isArray(scrips) ? scrips.join(',') : scrips;
        const event = (action === 'subs' ? 'subscribe' : 'unsubscribe') + type + (lite ? 'Lite' : '');
        this.log('Subscribe scrips:', event + ' ' + scripStr);
        const request = {
            event: event,
            inputtoken: scripStr,
        }
        this.sendMessage(JSON.stringify(request));    
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
        if (this.logEnabled) {
            console.log(`[KMD]`, ...args);
        }
    }
}