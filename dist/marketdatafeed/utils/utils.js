const LIB_VERSION = "3.0.0";
const isSingleLib = true;
var isEncyptIn = true;
var isEncyptOut = false;
var HSD_Flag = true;
var HSID_Flag = true;
const MAX_SCRIPS = 100;
const TRASH_VAL = -2147483648;
export var ackNum = 0; 
export var counter = 0;

export function isScripOK(a) {
    let scripsCount = a.split("&").length;
    if (scripsCount > MAX_SCRIPS) {
        console.error("Maximum scrips allowed per request is " + MAX_SCRIPS);
        return false
    }
    return true
}

export function getScripByteArray(c, a) {
    if (c.charCodeAt[c.length - 1] == "&") {
        c = c.substring(0, c.length - 1)
    }
    let scripArray = c.split("&");
    let scripsCount = scripArray.length;
    let dataLen = 0;
    for (let index = 0; index < scripsCount; index++) {
        scripArray[index] = a + "|" + scripArray[index];
        dataLen += scripArray[index].length + 1
    }
    let bytes = new Uint8Array(dataLen + 2);
    let pos = 0;
    bytes[pos++] = ((scripsCount >> 8) & 255);
    bytes[pos++] = (scripsCount & 255);
    for (let index = 0; index < scripsCount; index++) {
        let currScrip = scripArray[index];
        let scripLen = currScrip.length;
        bytes[pos++] = (scripLen & 255);
        for (let strIndex = 0; strIndex < scripLen; strIndex++) {
            bytes[pos++] = currScrip.charCodeAt(strIndex)
        }
    }
    return bytes
}