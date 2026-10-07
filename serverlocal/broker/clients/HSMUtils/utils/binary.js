/**
 * Binary utility functions for the Kotak WebSocket protocol.
 * Matches the behavior from the original hslib.js library.
 */

const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

function toUint8Array(a) {
    if (a instanceof Uint8Array) {
        return a;
    }
    if (a instanceof ArrayBuffer) {
        return new Uint8Array(a);
    }
    if (ArrayBuffer.isView(a)) {
        return new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
    }
    if (a && typeof a === 'object' && typeof a.length === 'number') {
        return new Uint8Array(a);
    }
    throw new TypeError('Unsupported binary input');
}

function toDataView(a) {
    if (a instanceof DataView) {
        return a;
    }
    if (a instanceof ArrayBuffer) {
        return new DataView(a);
    }
    if (ArrayBuffer.isView(a)) {
        return new DataView(a.buffer, a.byteOffset, a.byteLength);
    }
    throw new TypeError('Unsupported binary input');
}

export function buf2Long(a, offset = 0, length) {
    const b = toUint8Array(a);
    const start = offset || 0;
    const len = typeof length === 'number' ? length : b.length - start;
    let val = 0;
    for (let i = 0, j = len - 1; i < len; i++, j--) {
        val += b[start + j] << (i * 8);
    }
    return val >>> 0;
}

export function buf2Float(a, c = 0) {
    const dataView = toDataView(a);
    return dataView.getFloat32(c, false);
}

export function buf2String(a, offset = 0, length) {
    const b = toUint8Array(a);
    const start = offset || 0;
    const len = typeof length === 'number' ? length : b.length - start;
    const slice = b.subarray(start, start + len);
    return textDecoder ? textDecoder.decode(slice) : String.fromCharCode.apply(null, Array.from(slice));
}

export function getFormatDate(a) {
    let date = new Date(a * 1000);
    let formatDate = leadingZero(date.getDate()) + "/" + leadingZero((date.getMonth()) + 1) + "/" + date.getFullYear() + " " + leadingZero(date.getHours()) + ":" + leadingZero(date.getMinutes()) + ":" + leadingZero(date.getSeconds());
    return formatDate;
}

export function getFormatDate2(c) {
    var a = new Date(1970, 0, 1);
    a.setSeconds(c);
    let formatDate = leadingZero(a.getDate()) + "/" + leadingZero((a.getMonth()) + 1) + "/" + a.getFullYear() + " " + leadingZero(a.getHours()) + ":" + leadingZero(a.getMinutes()) + ":" + leadingZero(a.getSeconds());
    return formatDate;
}

export function leadingZero(a) {
    return a < 10 ? ("0" + a.toString()) : a.toString();
}

export function checkDateFormat(a) {
    return new RegExp("^(0{1}[1-9]|[12][0-9]|3[01])/(0{1}[1-9]|1[012])/20\\d{2}$").test(a);
}

export function sendJsonArrResp(a) {
    let jsonArrRes = [];
    jsonArrRes.push(a);
    return JSON.stringify(jsonArrRes);
}