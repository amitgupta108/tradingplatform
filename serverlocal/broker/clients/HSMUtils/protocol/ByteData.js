/**
 * ByteData wrapper for reading binary data from Kotak WebSocket protocol.
 * Provides methods to read long, float, string, and byte values at offsets.
 */
class ByteData {
    constructor(length) {
        this.pos = 0;
        this.bytes = new Uint8Array(length);
        this.startOfMsg = 0;
    }
    
    markStartOfMsg()
    {
        this.startOfMsg = this.pos;
        this.pos += 2
    }
    
    markEndOfMsg() {
        let len = (this.pos - this.startOfMsg - 2);
        this.bytes[0] = ((len >> 8) & 255);
        this.bytes[1] = (len & 255)
    }

    clear() {
        this.pos = 0
    }

    getPosition() {
        return this.pos
    }

    appendByte(d) {
        this.bytes[this.pos++] = d
    }

    appendByteAtPos(e, d) {
        this.bytes[e] = d
    }

    appendChar(d) {
        this.bytes[this.pos++] = d
    }
    appendCharAtPos(e, d) {
        this.bytes[e] = d
    }
    appendShort (d) {
        this.bytes[this.pos++] = ((d >> 8) & 255);
        this.bytes[this.pos++] = (d & 255)
    }
    appendInt(d) {
        this.bytes[this.pos++] = ((d >> 24) & 255);
        this.bytes[this.pos++] = ((d >> 16) & 255);
        this.bytes[this.pos++] = ((d >> 8) & 255);
        this.bytes[this.pos++] = (d & 255)
    }
    appendLong(d) {
        this.bytes[this.pos++] = ((d >> 56) & 255);
        this.bytes[this.pos++] = ((d >> 48) & 255);
        this.bytes[this.pos++] = ((d >> 40) & 255);
        this.bytes[this.pos++] = ((d >> 32) & 255);
        this.bytes[this.pos++] = ((d >> 24) & 255);
        this.bytes[this.pos++] = ((d >> 16) & 255);
        this.bytes[this.pos++] = ((d >> 8) & 255);
        this.bytes[this.pos++] = (d & 255)
    }
    appendLongAsBigInt(e) {
        const d = BigInt(e);
        this.bytes[this.pos++] = Number((d >> BigInt(56)) & BigInt(255));
        this.bytes[this.pos++] = Number((d >> BigInt(48)) & BigInt(255));
        this.bytes[this.pos++] = Number((d >> BigInt(40)) & BigInt(255));
        this.bytes[this.pos++] = Number((d >> BigInt(32)) & BigInt(255));
        this.bytes[this.pos++] = Number((d >> BigInt(24)) & BigInt(255));
        this.bytes[this.pos++] = Number((d >> BigInt(16)) & BigInt(255));
        this.bytes[this.pos++] = Number((d >> BigInt(8)) & BigInt(255));
        this.bytes[this.pos++] = Number(d & BigInt(255))
    }
    appendString(d) {
        let strLen = d.length;
        for (let i = 0; i < strLen; i++) {
            this.bytes[this.pos++] = d.charCodeAt(i)
        }
    }

    appendByteArr(d) {
        let byteLen = d.length;
        for (let i = 0; i < byteLen; i++) {
            this.bytes[this.pos++] = d[i]
        }
    }
    appendByteArr(e, d) {
        for (let i = 0; i < d; i++) {
            this.bytes[this.pos++] = e[i]
        }
    }
        
    getBytes() {
        return this.bytes;
    }
    getByteLength() {
        return this.bytes.length;
    }
        /**
     * Convenience method to read all data and parse into field values
     * based on a mapping array
     */
    static parse(data) {
        return new ByteData(new Uint8Array(data));
    }
}
export { ByteData };