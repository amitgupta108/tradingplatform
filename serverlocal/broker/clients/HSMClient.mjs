import { BinRespTypes, RespTypeValues, STAT, SCRIP_PREFIX, INDEX_PREFIX, RespTypes } from './HSMUtils/constants/types.js';
import { PacketBuilder } from './HSMUtils/protocol/PacketBuilder.js';
import { PacketParser } from './HSMUtils/protocol/PacketParser.js';
import { buf2Long } from './HSMUtils/utils/binary.js';
import { BrokerAdapter } from './BrokerAdpater.mjs';

const HSM_URL = 'wss://mlhsm.kotaksecurities.com';

export class HSMClient extends BrokerAdapter
{
    constructor(options) {
        super('HSMCLIENT', options);
        
        this.throttleIntId;
        this.throttleInterval;
        this.url = HSM_URL;
        this.topicList = {};
        this.channel = '1';
        this.ackObj = { ackNum: 0, counter: 0 };
    }

    initiateConnect(authData) {
        this.authData = authData;
        return this.connect(HSM_URL, 'ws');
    }

    onOpen() {
        this.ws.binaryType = 'arraybuffer';
        this.authenticate();
        this.ws.addEventListener('pong', () => {
            this.log('Heart Beat')
        });
    }

    authenticate() {
        const authPayload = PacketBuilder.buildConnection(this.authData.hsm_token, this.authData.hsm_sid);
        this.sendMessage(authPayload);
        this.log('Authentication request sent');
    }

    handleMessage(event) 
    {
        try 
        {
            const data = event.data;
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
                }, this.throttleInterval);
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
}