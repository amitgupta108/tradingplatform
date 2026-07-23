import { BinRespTypes } from '../types/types.js';
import { ByteData } from './ByteData.js';
import * as utils from '../utils/utils.js';
/**
 * Builds JSON request packets for the Kotak WebSocket protocol.
 */
class PacketBuilder {

    static buildAcknowledgementRequest(message_number) 
    {
        let buffer = new ByteData(11);
        buffer.markStartOfMsg();
        buffer.appendByte(BinRespTypes.ACK_TYPE);
        buffer.appendByte(1);
        buffer.appendByte(1);
        buffer.appendShort(4);
        buffer.appendInt(message_number);
        buffer.markEndOfMsg();
        
        return buffer.getBytes();
    }
    /**
     * Build a connection request packet.
     */
    static buildConnection(token, sid) 
    {
        const src = "JS_API";
        const srcLen = src.length;
        const tokenLen = token.length;
        const sidLen = sid.length;
        const buffer = new ByteData(srcLen + tokenLen + sidLen + 13);
        buffer.markStartOfMsg();
        buffer.appendByte(BinRespTypes.CONNECTION_TYPE);
        buffer.appendByte(3);
        buffer.appendByte(1);
        buffer.appendShort(tokenLen);
        buffer.appendString(token);
        buffer.appendByte(2);
        buffer.appendShort(sidLen);
        buffer.appendString(sid);
        buffer.appendByte(3);
        buffer.appendShort(srcLen);
        buffer.appendString(src);
        buffer.markEndOfMsg();
        return buffer.getBytes()
    }

    static buildSubsRequest(scrips, action, prefix, channel)
    {
        if (!utils.isScripOK(scrips)) {
            return
        }
        
        let dataArray = utils.getScripByteArray(scrips, prefix);
        let buffer = new ByteData(dataArray.length + 11);
        
        buffer.markStartOfMsg();
        buffer.appendByte(action);
        buffer.appendByte(2);
        buffer.appendByte(1);
        buffer.appendShort(dataArray.length);
        buffer.appendByteArr(dataArray, dataArray.length);
        buffer.appendByte(2);
        buffer.appendShort(1);
        buffer.appendByte(channel);
        buffer.markEndOfMsg();

        return buffer.getBytes()
    }
    
    static buildChannelRequest(action, channel) 
    {
        let buffer = new ByteData(15);
        buffer.markStartOfMsg();
        buffer.appendByte(action);
        buffer.appendByte(1);
        buffer.appendByte(1);
        buffer.appendShort(8);
        let int1 = 0,
            int2 = 0;
        channel.forEach(function (d) {
            if (d > 0 && d <= 32) {
                int1 |= 1 << d
            } else {
                if (d > 32 && d <= 64) {
                    int2 |= 1 << d
                } else {
                    console.error("Error: Channel values must be in this range  [ val > 0 && val < 65 ]")
                }
            }
        });
        buffer.appendInt(int2);
        buffer.appendInt(int1);
        buffer.markEndOfMsg();
        return buffer.getBytes()
    }

    static buildSnapshotRequest(scrips, type, prefix) 
    {
        if (!utils.isScripOK(scrips)) {
            return
        }
        let dataArray = utils.getScripByteArray(scrips, prefix);
        let buffer = new ByteData(dataArray.length + 7);
    
        buffer.markStartOfMsg();
        buffer.appendByte(type);
        buffer.appendByte(1);
        buffer.appendByte(1);
        buffer.appendShort(dataArray.length);
        buffer.appendByteArr(dataArray, dataArray.length);
        buffer.markEndOfMsg();

        return buffer.getBytes()
    }

    static buildThrottlingRequest(scrips)
    {
        let buffer = new ByteData(11);
        buffer.markStartOfMsg();
        buffer.appendByte(BinRespTypes.THROTTLING_TYPE);
        buffer.appendByte(1);
        buffer.appendByte(1);
        buffer.appendShort(4);
        buffer.appendInt(scrips);
        buffer.markEndOfMsg();

        return buffer.getBytes()
    }
    /**
     * Build an OPC subscription request.
     */
    static buildOptionChainRequest(key, stkprc, highstk, lowstk, channel) 
    {
        let opcKeyLen = key.length;
        let buffer = new ByteData(opcKeyLen + 30);
        buffer.markStartOfMsg();
        buffer.appendByte(BinRespTypes.OPC_SUBSCRIBE);
        buffer.appendByte(5);
        buffer.appendByte(1);
        buffer.appendShort(opcKeyLen);
        buffer.appendString(key);
        buffer.appendByte(2);
        buffer.appendShort(8);
        buffer.appendLongAsBigInt(stkprc);
        buffer.appendByte(3);
        buffer.appendShort(1);
        buffer.appendByte(highstk);
        buffer.appendByte(4);
        buffer.appendShort(1);
        buffer.appendByte(lowstk);
        buffer.appendByte(5);
        buffer.appendShort(1);
        buffer.appendByte(channel);
        buffer.markEndOfMsg();

        return buffer.getBytes();
    }
}
export { PacketBuilder };