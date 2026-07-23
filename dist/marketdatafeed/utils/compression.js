import {inflate, deflate} from 'pako';
/**
 * Compress a string using deflate and base64 encode
 */
export function encodeData(data) {
    const compressed = Buffer.from(deflate(data));
    return compressed.toString('base64');
}
/**
 * Base64 decode and inflate compressed data
 */
export function decodeData(data) {
    const decoded = Buffer.from(data, 'base64');
    const inflated = inflate(decoded);
    return _atos(inflated);
}
/**
 * Convert array of byte values to string
 */
function _atos(arr) {
    const newArray = [];
    for (let i = 0; i < arr.length; i++) {
        newArray.push(String.fromCharCode(arr[i]));
    }
    return newArray.join('');
}
