import { BaseClient } from './BaseClient.js';
import { RespTypeValues, STAT, BinRespTypes, SCRIP_PREFIX, INDEX_PREFIX, DEPTH_PREFIX, RespTypes } from '../types/types.js';
import { PacketBuilder } from '../protocol/PacketBuilder.js';

const HSM_URL = 'wss://mlhsm.kotaksecurities.com';

class HSMClient extends BaseClient 
{
    constructor(config) {
        super(HSM_URL, {
            autoReconnect: config.autoReconnect ?? true,
            maxRetries: config.maxRetries ?? 5,
            retryDelay: config.retryDelay ?? 3000,
            heartbeatInterval: config.heartbeatInterval ?? 10000,
            throttleInterval: config.throttleInterval ?? 30000,
            logEnabled: true,
        });
        this.channel = '1';
        this.authData = null;
        this.throttleIntId;
    }
    
    initiateConnect(authData){
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
            this.handleQuote(message);
        else
            this.handleConfirmations(message);
    }

    handleQuote(parsed)
    {
        parsed.forEach((item) => {
            this.emit(item.type === RespTypes.UPDATE ? 'quote' : 'snapshot', item.data);
        });
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
    
    // ==================== PUBLIC API ====================
    subscribeScrips(scrips) {
        const scripStr = Array.isArray(scrips) ? scrips.join('&') : scrips;
        const request = PacketBuilder.buildSubsRequest(scripStr, BinRespTypes.SUBSCRIBE_TYPE, SCRIP_PREFIX, this.channel);
        this.sendMessage(request);
        this.log('Subscribing to scrips:', scripStr);
    }

    unsubscribeScrips(scrips) {
        const scripStr = Array.isArray(scrips) ? scrips.join('&') : scrips;
        const request = PacketBuilder.buildSubsRequest(scripStr, BinRespTypes.UNSUBSCRIBE_TYPE, SCRIP_PREFIX, this.channel);
        this.sendMessage(request);
        this.log('Unsubscribing from scrips:', scripStr);
    }

    subscribeIndicies(scrips) {
        const scripStr = Array.isArray(scrips) ? scrips.join('&') : scrips;
        const request = PacketBuilder.buildSubsRequest(scripStr, BinRespTypes.SUBSCRIBE_TYPE, INDEX_PREFIX, this.channel);
        this.sendMessage(request);
        this.log('Subscribing to indicies:', scripStr);
    }

    unsubscribeIndicies(scrips) {
        const scripStr = Array.isArray(scrips) ? scrips.join('&') : scrips;
        const request = PacketBuilder.buildSubsRequest(scripStr, BinRespTypes.UNSUBSCRIBE_TYPE, INDEX_PREFIX, this.channel);
        this.sendMessage(request);
        this.log('Unsubscribing from indicies:', scripStr);
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

export { HSMClient };