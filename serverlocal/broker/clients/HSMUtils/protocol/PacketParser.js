import { BinRespTypes, BinRespStat, STAT, RespTypeValues, RespCodes, TopicTypes, RespTypes } from '../constants/types.js';
import { ScripTopicData } from '../models/ScripTopicData.js';
import { IndexTopicData } from '../models/IndexTopicData.js';
import { DepthTopicData } from '../models/DepthTopicData.js';
import { sendJsonArrResp } from '../utils/binary.js';
import { decodeData } from '../utils/compression.js';


const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;
const DEBUG_PARSER = false;

/**
 * Parses incoming binary packets from the Kotak WebSocket protocol.
 */
class PacketParser {

    static getDataView(data) {
        if (data instanceof DataView) {
            return data;
        }
        if (data instanceof ArrayBuffer) {
            return new DataView(data);
        }
        if (ArrayBuffer.isView(data)) {
            return new DataView(data.buffer, data.byteOffset, data.byteLength);
        }
        return new DataView(data);
    }

    static readUint8(view, pos) {
        return view.getUint8(pos);
    }

    static readUint16(view, pos) {
        return view.getUint16(pos, false);
    }

    static readUint32(view, pos) {
        return view.getUint32(pos, false);
    }

    static readString(view, pos, len) {
        const bytes = new Uint8Array(view.buffer, view.byteOffset + pos, len);
        return textDecoder ? textDecoder.decode(bytes) : String.fromCharCode.apply(null, Array.from(bytes));
    }

    static init(data)
    {
        const view = this.getDataView(data);
        let pos = 2;
        const respType = view.getUint8(pos);
        pos += 1;
        return {responseType: respType, position: pos, view};
    }

    static parseData(data, resp, topicList)
    {   
        const respType = resp.responseType;
        const pos = resp.position;
        const view = resp.view;

        if (respType == BinRespTypes.DATA_TYPE)
            return this.parseDataMessage(pos, view, topicList);
        else
            return this.parseConfirmationMessge(pos, respType, view, data);
    }

    static parseConfirmationMessge(pos, respType, view, data)
    {
        if (respType == BinRespTypes.CONNECTION_TYPE)
            return this.parseConnectionMessge(pos, view, data);
        else
            return this.parseOtherMessage(pos, respType, view, data);
    } 
  
    static parseConnectionMessge(pos, view, data)
    {
        let jsonRes = {};
        let ackCount;
        let fCount = this.readUint8(view, pos);
        pos += 1;
        if (fCount >= 2) {
            let fid1 = this.readUint8(view, pos);
            pos += 1;
            let valLen = this.readUint16(view, pos);
            pos += 2;
            let status = this.readString(view, pos, valLen);
            pos += valLen;
            fid1 = this.readUint8(view, pos);
            pos += 1;
            valLen = this.readUint16(view, pos);
            pos += 2;
            ackCount = this.readUint16(view, pos);
            switch (status) {
                case BinRespStat.OK:
                    jsonRes.stat = STAT.OK;
                    jsonRes.type = RespTypeValues.CONN;
                    jsonRes.msg = "successful";
                    jsonRes.stCode = RespCodes.SUCCESS;
                    break;
                case BinRespStat.NOT_OK:
                    jsonRes.stat = STAT.NOT_OK;
                    jsonRes.type = RespTypeValues.CONN;
                    jsonRes.msg = "failed";
                    jsonRes.stCode = RespCodes.CONNECTION_FAILED;
                    break
            }
        } else {
            if (fCount == 1) {
                let fid1 = this.readUint8(view, pos);
                pos += 1;
                let valLen = this.readUint16(view, pos);
                pos += 2;
                let status = this.readString(view, pos, valLen);
                pos += valLen;
                switch (status) {
                    case BinRespStat.OK:
                        jsonRes.stat = STAT.OK;
                        jsonRes.type = RespTypeValues.CONN;
                        jsonRes.msg = "successful";
                        jsonRes.stCode = RespCodes.SUCCESS;
                        break;
                    case BinRespStat.NOT_OK:
                        jsonRes.stat = STAT.NOT_OK;
                        jsonRes.type = RespTypeValues.CONN;
                        jsonRes.msg = "failed";
                        jsonRes.stCode = RespCodes.CONNECTION_FAILED;
                        break
                }
            } else {
                jsonRes.stat = STAT.NOT_OK;
                jsonRes.type = RespTypeValues.CONN;
                jsonRes.msg = "invalid field count";
                jsonRes.stCode = RespCodes.CONNECTION_INVALID;
            }
        }
        return {resp: jsonRes, ackCount: ackCount};
    }

    static parseDataMessage(pos, view, topicList)
    {
        const h = [];
        const g = this.readUint16(view, pos);
        pos += 2;
        for (let n = 0; n < g; n++) {
            pos += 2;
            const c = this.readUint8(view, pos);
            pos++;
            if (c === RespTypes.SNAP) {
                const returnval = this.parseSnapshot(pos, view, topicList);
                h.push({data: returnval.data, type: c});
                pos = returnval.pos;
            }
            else if (c === RespTypes.UPDATE) {
                const returnVal = this.parseTopic(pos, view, topicList);
                h.push({ data: returnVal.data, type: c });
                pos = returnVal.pos;
            }
            else if (DEBUG_PARSER)
                console.error("Invalid ResponseType: " + c);
        }
        return h;
    }

    static parseSnapshot(pos, view, topicList)
    {
        const f = this.readUint32(view, pos);
        pos += 4;
        const nameLen = this.readUint8(view, pos);
        pos++;
        const topicName = this.readString(view, pos, nameLen);
        pos += nameLen;
        const d = this.getNewTopicData(topicName);
        if (d) {
            topicList[f] = d;
            let fcount = this.readUint8(view, pos);
            pos++;
            for (let index = 0; index < fcount; index++) {
                const fvalue = this.readUint32(view, pos);
                d.setLongValues(index, fvalue);
                pos += 4;
            }
            d.setMultiplierAndPrec();
            fcount = this.readUint8(view, pos);
            pos++;
            for (let index = 0; index < fcount; index++) {
                const fid = this.readUint8(view, pos);
                pos++;
                const dataLen = this.readUint8(view, pos);
                pos++;
                const strVal = this.readString(view, pos, dataLen);
                pos += dataLen;
                d.setStringValues(fid, strVal);
            }
            return {data: d.prepareData(), pos: pos};
        } else if (DEBUG_PARSER)
            console.log("Invalid topic feed type !");
    }

    static parseTopic(pos, view, topicList)
    {
        const f = this.readUint32(view, pos);
        pos += 4;
        const d = topicList[f];
        if (d) {
            const fcount = this.readUint8(view, pos);
            pos++;
            for (let index = 0; index < fcount; index++) {
                const fvalue = this.readUint32(view, pos);
                d.setLongValues(index, fvalue);
                pos += 4;
            }            
            return { data: d.prepareData(), pos: pos };
        } else if (DEBUG_PARSER)
            console.error("Topic Not Available in TopicList!");
    }

    static parseOtherMessage(pos, respType, view, data)
    {
        if (respType  == BinRespTypes.SUBSCRIBE_TYPE || respType  == BinRespTypes.UNSUBSCRIBE_TYPE)
            return this.parseSubsMessage(pos, respType, view, data);
        else if (respType == BinRespTypes.SNAPSHOT)
            return this.parseSnapshotMessage(pos, respType, view, data);
/*        else if ((respType == BinRespTypes.CHPAUSE_TYPE || respType == BinRespTypes.CHRESUME_TYPE))
            return parseChannelMessage(pos, respType, data);
        else if (respType == BinRespTypes.OPC_SUBSCRIBE)
            return this.parseOPCMessage(pos, respType, data);
*/       else 
            return {};
    }

    static parseSubsMessage(pos, respType, view, data)
    {
        let status = this.getStatus(view, pos);
        let jsonRes = {};
        switch (status) {
            case BinRespStat.OK:
                jsonRes.stat = STAT.OK;
                jsonRes.type = respType  == BinRespTypes.SUBSCRIBE_TYPE ? RespTypeValues.SUBS : RespTypeValues.UNSUBS;
                jsonRes.msg = "successful";
                jsonRes.stCode = RespCodes.SUCCESS;
                break;
            case BinRespStat.NOT_OK:
                jsonRes.stat = STAT.NOT_OK;
                if (respType  == BinRespTypes.SUBSCRIBE_TYPE) {
                    jsonRes.type = RespTypeValues.SUBS;
                    jsonRes.msg = "subscription failed";
                    jsonRes.stCode = RespCodes.SUBSCRIPTION_FAILED
                } else {
                    jsonRes.type = RespTypeValues.UNSUBS;
                    jsonRes.msg = "unsubscription  failed";
                    jsonRes.stCode = RespCodes.UNSUBSCRIPTION_FAILED
                }
                break
        }
        return jsonRes;
    }

    static parseSnapshotMessage(pos, respType, view, data)
    {
        let status = this.getStatus(view, pos);
        let jsonRes = {};
        switch (status) {
            case BinRespStat.OK:
                jsonRes.stat = STAT.OK;
                jsonRes.type = RespTypeValues.SNAP;
                jsonRes.msg = "successful";
                jsonRes.stCode = RespCodes.SUCCESS;
                break;
            case BinRespStat.NOT_OK:
                jsonRes.stat = STAT.NOT_OK;
                jsonRes.type = RespTypeValues.SNAP;
                jsonRes.msg = "failed";
                jsonRes.stCode = RespCodes.SNAPSHOT_FAILED;
                break
        }
        return jsonRes;
    }
    
    static parseChannelMessage(pos, respType, view, data)
    {
        let status = this.getStatus(view, pos);
        let jsonRes = {};
        switch (status) {
            case BinRespStat.OK:
                jsonRes.stat = STAT.OK;
                jsonRes.type = respType  == BinRespTypes.CHPAUSE_TYPE ? RespTypeValues.CHANNELP : RespTypeValues.CHANNELR;
                jsonRes.msg = "successful";
                jsonRes.stCode = RespCodes.SUCCESS;
                break;
            case BinRespStat.NOT_OK:
                jsonRes.stat = STAT.NOT_OK;
                jsonRes.type = respType  == BinRespTypes.CHPAUSE_TYPE ? RespTypeValues.CHANNELP : RespTypeValues.CHANNELR;
                jsonRes.msg = "failed";
                jsonRes.stCode = respType  == BinRespTypes.CHPAUSE_TYPE ? RespCodes.CHANNELP_FAILED : RespCodes.CHANNELR_FAILED;
                break
        }
        return jsonRes;
    }
    
    static parseOPCMessage(pos, respType, view, data)
    {
        let status = this.getStatus(view, pos);
        pos += 5;
        let jsonRes = {};
        switch (status) {
            case BinRespStat.OK:
                jsonRes.stat = STAT.OK;
                jsonRes.type = RespTypeValues.OPC;
                jsonRes.msg = "successful";
                jsonRes.stCode = RespCodes.SUCCESS;
                let fld = this.readUint8(view, pos);
                let fieldlength = this.readUint16(view, pos + 1);
                pos += 2;
                let opcKey = this.readString(view, pos, fieldlength);
                pos += fieldlength;
                jsonRes.key = opcKey;
                fld = this.readUint8(view, pos);
                fieldlength = this.readUint16(view, pos + 1);
                pos += 2;
                let payload = this.readString(view, pos, fieldlength);
                pos += fieldlength;
                jsonRes.scrips = JSON.parse(payload)["data"];
                break;
            case BinRespStat.NOT_OK:
                jsonRes.stat = STAT.NOT_OK;
                jsonRes.type = RespTypeValues.OPC;
                jsonRes.msg = "failed";
                jsonRes.stCode = 11040;
                break
        }
        return jsonRes;
    }

    static getStatus(view, pos)
    {
        let status = BinRespStat.NOT_OK;
        let fieldCount = this.readUint8(view, pos);
        pos += 1;
        if (fieldCount > 0) {
            let fld = this.readUint8(view, pos);
            pos += 1;
            let fieldlength = this.readUint16(view, pos);
            pos += 2;
            status = this.readString(view, pos, fieldlength);
            pos += fieldlength;
        }
        return status;
    };

    static getNewTopicData(c) 
    {
        let feedType = c.split("|")[0];
        let topic = null;
        switch (feedType) {
            case TopicTypes.SCRIP:
                topic = new ScripTopicData();
                break;
            case TopicTypes.INDEX:
                topic = new IndexTopicData();
                break;
            case TopicTypes.DEPTH:
                topic = new DepthTopicData();
                break
        }
        return topic
    }
    
    /**
     * Parse topic data from the payload portion of a binary packet.
     * Format: [topic string null-terminated][binary fields per mapping]
     */
/*    static parseTopicData(payload) 
    {
        if (payload.length < 2)
            return null;
        // Read the topic string (null-terminated)
        let topicEnd = 0;
        while (topicEnd < payload.length && payload[topicEnd] !== 0) {
            topicEnd++;
        }
        const topic = buf2String(payload, 0, topicEnd);
        if (!topic)
            return null;
        // The remaining bytes after the topic string are the binary field data
        const fieldData = payload.slice(topicEnd + 1);
        const topicByteData = new ByteData(fieldData);
        if (topic.startsWith(TopicTypes.SCRIP)) {
            return new ScripTopicData(topic, topicByteData);
        }
        else if (topic.startsWith(TopicTypes.INDEX)) {
            return new IndexTopicData(topic, topicByteData);
        }
        else if (topic.startsWith(TopicTypes.DEPTH)) {
            return new DepthTopicData(topic, topicByteData);
        }
        return null;
    }
 */   /**
     * Parse snapshot data (similar to topic data but may include multiple entries).
     */
/*    static parseSnapshot(payload) {
        const result = {};
        const topicData = this.parseTopicData(payload);
        if (topicData) {
            result.topic = topicData.topic;
            result.data = topicData.getData();
        }
        return result;
    }
*/    /**
     * Parse a JSON text message from the WebSocket.
     */
    static parseTextMessage(data) {
        try {
            return decodeData(data);
        }
        catch {
            return { raw: data };
        }
    }

    static _parseData(data, resp, topicList) {
        let respType = resp.responseType;
        let pos = resp.position;

        switch (respType) {
            case BinRespTypes.CONNECTION_TYPE:
                return this.parseConnectionMessge(pos, data);
                break;
            case BinRespTypes.DATA_TYPE:
                return this.parseDataMessage(pos, data, topicList);
                break;
            case BinRespTypes.SUBSCRIBE_TYPE:
                return this.parseSubsMessage(pos, respType, data);
                break;
            case BinRespTypes.UNSUBSCRIBE_TYPE:
                return this.parseSubsMessage(pos, respType, data);
                break;
            case BinRespTypes.SNAPSHOT:
                return this.parseSnapshotMessage(pos, respType, data);
                break;
            case BinRespTypes.CHPAUSE_TYPE:
                return parseChannelMessage(pos, respType, data);
                break;
            case BinRespTypes.CHRESUME_TYPE:
                return parseChannelMessage(pos, respType, data);
                break;
            case BinRespTypes.OPC_SUBSCRIBE:
                return this.parseOPCMessage(pos, respType, data);
                break;
            default:
                return sendJsonArrResp([]);
        }
    }
}
export { PacketParser };