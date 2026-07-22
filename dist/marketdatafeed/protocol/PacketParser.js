import { ByteData } from './ByteData.js';
import { BinRespTypes, BinRespStat, STAT, RespTypeValues, RespCodes, TopicTypes, RespTypes } from '../types/types.js';
import { ScripTopicData } from '../models/ScripTopicData.js';
import { IndexTopicData } from '../models/IndexTopicData.js';
import { DepthTopicData } from '../models/DepthTopicData.js';
import { PacketBuilder } from './PacketBuilder.js';
import { buf2Long, buf2Float, buf2String, sendJsonArrResp } from '../utils/binary.js';
import { decodeData } from '../utils/compression.js';
import * as utils from '../utils/utils.js';
/**
 * Parses incoming binary packets from the Kotak WebSocket protocol.
 */
class PacketParser {

    static init(data)
    {
        let pos = 0;
        let packetsCount = buf2Long(data.slice(pos, 2));
        //console.log("packets.length: " + packetsCount);
        pos += 2;
        let respType = buf2Long(data.slice(pos, pos + 1));
        pos += 1;
        //console.log("TYPE:: " + respType);
        return {responseType: respType, position: pos};
    }

    static parseData(data, resp, topicList)
    {   let respType = resp.responseType;
        let pos = resp.position;

        if (respType  == BinRespTypes.CONNECTION_TYPE)
            return this.parseConnectionMessge(pos, data);
        else
            return this.parseNonConnMessage(pos, respType , data, topicList);
    }

    static _parseData(data, resp, topicList) {
        let respType = resp.responseType;
        let pos = resp.position;

        switch (respType) {
            case BinRespTypes.CONNECTION_TYPE :
                return this.parseConnectionMessge(pos, data);
                break;
            case BinRespTypes.DATA_TYPE :
                return this.parseDataMessage(pos, data, topicList);
                break;
            case BinRespTypes.SUBSCRIBE_TYPE :
                return this.parseSubsMessage(pos, respType, data);
                break; 
            case BinRespTypes.UNSUBSCRIBE_TYPE:
                return this.parseSubsMessage(pos, respType, data);
                break;
            case BinRespTypes.SNAPSHOT:
                return this.parseSnapshotMessage(pos, respType, data);
                break;
            case BinRespTypes.CHPAUSE_TYPE :
                return parseChannelMessage(pos, respType, data);
                break;
            case BinRespTypes.CHRESUME_TYPE :
                return parseChannelMessage(pos, respType, data);
                break;
            case BinRespTypes.OPC_SUBSCRIBE :
                return this.parseOPCMessage(pos, respType, data);
                break;
            default:
                return sendJsonArrResp([]);
        }
    }

    static parseConnectionMessge(pos, data)
    {
        let jsonRes = {};
        let ackCount;
        let fCount = buf2Long(data.slice(pos, pos + 1));
        pos += 1;
        if (fCount >= 2) {
            let fid1 = buf2Long(data.slice(pos, pos + 1));
            pos += 1;
            let valLen = buf2Long(data.slice(pos, pos + 2));
            pos += 2;
            let status = buf2String(data.slice(pos, pos + valLen));
            pos += valLen;
            fid1 = buf2Long(data.slice(pos, pos + 1));
            pos += 1;
            valLen = buf2Long(data.slice(pos, pos + 2));
            pos += 2;
            ackCount = buf2Long(data.slice(pos, pos + valLen));
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
                let fid1 = buf2Long(data.slice(pos, pos + 1));
                pos += 1;
                let valLen = buf2Long(data.slice(pos, pos + 2));
                pos += 2;
                let status = buf2String(data.slice(pos, pos + valLen));
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
        return {JSONArrayResp: sendJsonArrResp(jsonRes), ackCount: ackCount};
    }

    static parseNonConnMessage(pos, respType , data, topicList)
    {
        if (respType  == BinRespTypes.DATA_TYPE) 
            return this.parseDataMessage(pos, data, topicList);
        else 
            return this.parseConfMessage(pos, respType , data);
    } 

    static parseDataMessage(pos, data, topicList)
    {
        const h = [];
        var g = buf2Long(data.slice(pos, pos + 2));
        pos += 2;
        for (let n = 0; n < g; n++) {
            pos += 2;
            var c = buf2Long(data.slice(pos, pos + 1));
            console.log("ResponseType: " + c);
            pos++;
            if (c == RespTypes.SNAP) {
                const returnval = this.parseSnapshot(pos, data, topicList);
                h.push(returnval.data);
                pos = returnval.pos;
            }
            else if (c == RespTypes.UPDATE) {
                const returnVal = this.parseTopic(pos, data, topicList);
                h.push(returnVal.data);
                pos = returnVal.pos;
            }
            else
                console.error("Invalid ResponseType: " + c);
        }
        return JSON.stringify(h);
    }

    static parseSnapshot(pos, data, topicList)
    {
        let f = buf2Long(data.slice(pos, pos + 4));
        pos += 4;
        //console.log("topic Id: " + f);
        let nameLen = buf2Long(data.slice(pos, pos + 1));
        pos++;
        //console.log("nameLen:" + nameLen);
        let topicName = buf2String(data.slice(pos, pos + nameLen));
        pos += nameLen;
        //console.log("topicName: " + topicName);
        let d = this.getNewTopicData(topicName);
        if (d) {
            topicList[f] = d;
            let fcount = buf2Long(data.slice(pos, pos + 1));
            pos++;
            //console.log("fcount1: " + fcount);
            for (let index = 0; index < fcount; index++) {
                let fvalue = buf2Long(data.slice(pos, pos + 4));
                d.setLongValues(index, fvalue);
                pos += 4;
                //console.log(index + ":" + fvalue)
            }
            d.setMultiplierAndPrec();
            fcount = buf2Long(data.slice(pos, pos + 1));
            pos++;
            //console.log("fcount2: " + fcount);
            for (let index = 0; index < fcount; index++) {
                let fid = buf2Long(data.slice(pos, pos + 1));
                pos++;
                let dataLen = buf2Long(data.slice(pos, pos + 1));
                pos++;
                let strVal = buf2String(data.slice(pos, pos + dataLen));
                pos += dataLen;
                d.setStringValues(fid, strVal);
                //console.log(fid + ":" + strVal)
            }
            return {data: d.prepareData(), pos: pos};
        } else {
            console.log("Invalid topic feed type !")
        }
    }

    static parseTopic(pos, data, topicList)
    {
        //console.log("updates ......");
        var f = buf2Long(data.slice(pos, pos + 4));
        console.log("topic Id: " + f);
        pos += 4;
        var d = topicList[f];
        if (!d) {
            console.error("Topic Not Available in TopicList!")
        } else {
            let fcount = buf2Long(data.slice(pos, pos + 1));
            pos++;
            //console.log("fcount1: " + fcount);
            for (let index = 0; index < fcount; index++) {
                let fvalue = buf2Long(data.slice(pos, pos + 4));
                d.setLongValues(index, fvalue);
                //console.log("index:" + index + ", val:" + fvalue);
                pos += 4
            }
        }
        return { data: d.prepareData(), pos: pos };
    }

    static parseConfMessage(pos, respType , data)
    {
        if (respType  == BinRespTypes.SUBSCRIBE_TYPE || respType  == BinRespTypes.UNSUBSCRIBE_TYPE)
            return this.parseSubsMessage(pos, respType , data);
        else if (respType == BinRespTypes.SNAPSHOT)
            return this.parseSnapshotMessage(pos, respType , data);
        else if ((respType == BinRespTypes.CHPAUSE_TYPE || respType == BinRespTypes.CHRESUME_TYPE))
            return parseChannelMessage(pos, respType, data);
        else if (respType == BinRespTypes.OPC_SUBSCRIBE)
            return this.parseOPCMessage(pos, respType, data);
        else 
            return sendJsonArrResp([]);
    }

    static parseSubsMessage(pos, respType , data)
    {
        let status = this.getStatus(data, pos);
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
        return sendJsonArrResp(jsonRes)
    }

    static parseSnapshotMessage(pos, respType , data)
    {
        let status = this.getStatus(data, pos);
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
        return sendJsonArrResp(jsonRes)    
    }
    
    static parseChannelMessage(pos, respType, data)
    {
        let status = this.getStatus(data, pos);
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
        return sendJsonArrResp(jsonRes)
    }
    
    static parseOPCMessage(pos, respType, data)
    {
        let status = this.getStatus(data, pos);
        pos += 5;
        let jsonRes = {};
        switch (status) {
            case BinRespStat.OK:
                jsonRes.stat = STAT.OK;
                jsonRes.type = RespTypeValues.OPC;
                jsonRes.msg = "successful";
                jsonRes.stCode = RespCodes.SUCCESS;
                let fld = buf2Long(data.slice(pos, ++pos));
                let fieldlength = buf2Long(data.slice(pos, pos + 2));
                pos += 2;
                let opcKey = buf2String(data.slice(pos, pos + fieldlength));
                pos += fieldlength;
                jsonRes.key = opcKey;
                fld = buf2Long(data.slice(pos, ++pos));
                fieldlength = buf2Long(data.slice(pos, pos + 2));
                pos += 2;
                let data = buf2String(data.slice(pos, pos + fieldlength));
                pos += fieldlength;
                jsonRes.scrips = JSON.parse(data)["data"];
                break;
            case BinRespStat.NOT_OK:
                jsonRes.stat = STAT.NOT_OK;
                jsonRes.type = RespTypeValues.OPC;
                jsonRes.msg = "failed";
                jsonRes.stCode = 11040;
                break
        }
        return sendJsonArrResp(jsonRes)
    }

    static getStatus(data, pos)
    {
        let status = BinRespStat.NOT_OK;
        let fieldCount = buf2Long(data.slice(pos, ++pos));
        if (fieldCount > 0) {
            let fld = buf2Long(data.slice(pos, ++pos));
            let fieldlength = buf2Long(data.slice(pos, pos + 2));
            pos += 2;
            status = buf2String(data.slice(pos, pos + fieldlength));
            pos += fieldlength
        }
        return status
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
}
export { PacketParser };