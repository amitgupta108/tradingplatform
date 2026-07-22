/**
 * Binary utility functions for the Kotak WebSocket protocol.
 * Matches the behavior from the original hslib.js library.
 */
/*
function buf2Long(bytes, offset = 0, length) {
    const len = length || bytes.length - offset;
    const b = new Uint8Array(bytes.slice(offset, offset + len));
    let val = 0;
    for (let i = 0, j = len - 1; i < len; i++, j--) {
        val += b[j] << (i * 8);
    }
    return val >>> 0; // ensure unsigned
}
function buf2Float(data, offset) {
    const dataView = new DataView(data, offset, 4);
    return dataView.getFloat32(0, false); // big-endian
}
function buf2String(bytes, offset = 0, length) {
    const len = length || bytes.length - offset;
    const b = new Uint8Array(bytes.slice(offset, offset + len));
    return String.fromCharCode.apply(null, Array.from(b));
}
function leadingZero(num) {
    return num < 10 ? '0' + num.toString() : num.toString();
}
function getFormatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    const formatDate = leadingZero(date.getDate()) +
        '/' +
        leadingZero(date.getMonth() + 1) +
        '/' +
        date.getFullYear() +
        ' ' +
        leadingZero(date.getHours()) +
        ':' +
        leadingZero(date.getMinutes()) +
        ':' +
        leadingZero(date.getSeconds());
    return formatDate;
}
function isScripOK(scrips) {
    const MAX_SCRIPS = 100;
    const scripsCount = scrips.split('&').length;
    if (scripsCount > MAX_SCRIPS) {
        console.error('Maximum scrips allowed per request is ' + MAX_SCRIPS);
        return false;
    }
    return true;
}
function sendJsonArrResp(data) {
    return JSON.stringify([data]);
}
    */

export function buf2Long(a) {
    let b = new Uint8Array(a),
        val = 0,
        len = b.length;
    for (let i = 0, j = len - 1; i < len; i++, j--) {
        val += b[j] << (i * 8)
    }
    return val
}

export function buf2Float(a, c) {
    let dataView = new DataView(a, c, 4);
    return dataView.getFloat32()
}

export function buf2String(a) {
    return String.fromCharCode.apply(null, new Uint8Array(a))
}

export function getFormatDate(a) {
    let date = new Date(a * 1000);
    let formatDate = leadingZero(date.getDate()) + "/" + leadingZero((date.getMonth()) + 1) + "/" + date.getFullYear() + " " + leadingZero(date.getHours()) + ":" + leadingZero(date.getMinutes()) + ":" + leadingZero(date.getSeconds());
    return formatDate
}

export function getFormatDate2(c) {
    var a = new Date(1970, 0, 1);
    a.setSeconds(c);
    let formatDate = leadingZero(a.getDate()) + "/" + leadingZero((a.getMonth()) + 1) + "/" + a.getFullYear() + " " + leadingZero(a.getHours()) + ":" + leadingZero(a.getMinutes()) + ":" + leadingZero(a.getSeconds());
    return formatDate
}

export function leadingZero(a) {
    return a < 10 ? ("0" + a.toString()) : a.toString()
}


export function checkDateFormat(a) {
    return new RegExp("^(0{1}[1-9]|[12][0-9]|3[01])/(0{1}[1-9]|1[012])/20\\d{2}$").test(a)
}

export function sendJsonArrResp(a) {
    let jsonArrRes = [];
    jsonArrRes.push(a);
    return JSON.stringify(jsonArrRes)
}