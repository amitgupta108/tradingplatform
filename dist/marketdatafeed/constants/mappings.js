import { DataType, FieldTypes } from '../types/types.js';
// ==================== SCRIP INDEX CONSTANTS ====================
var SCRIP_INDEX;
(function (SCRIP_INDEX) {
    SCRIP_INDEX[SCRIP_INDEX["VOLUME"] = 4] = "VOLUME";
    SCRIP_INDEX[SCRIP_INDEX["LTP"] = 5] = "LTP";
    SCRIP_INDEX[SCRIP_INDEX["VWAP"] = 13] = "VWAP";
    SCRIP_INDEX[SCRIP_INDEX["CLOSE"] = 21] = "CLOSE";
    SCRIP_INDEX[SCRIP_INDEX["MULTIPLIER"] = 23] = "MULTIPLIER";
    SCRIP_INDEX[SCRIP_INDEX["PRECISION"] = 24] = "PRECISION";
    SCRIP_INDEX[SCRIP_INDEX["CHANGE"] = 25] = "CHANGE";
    SCRIP_INDEX[SCRIP_INDEX["PERCHANGE"] = 26] = "PERCHANGE";
    SCRIP_INDEX[SCRIP_INDEX["TURNOVER"] = 27] = "TURNOVER";
})(SCRIP_INDEX || (SCRIP_INDEX = {}));
// ==================== INDEX INDEX CONSTANTS ====================
var INDEX_INDEX;
(function (INDEX_INDEX) {
    INDEX_INDEX[INDEX_INDEX["LTP"] = 2] = "LTP";
    INDEX_INDEX[INDEX_INDEX["CLOSE"] = 3] = "CLOSE";
    INDEX_INDEX[INDEX_INDEX["MULTIPLIER"] = 8] = "MULTIPLIER";
    INDEX_INDEX[INDEX_INDEX["PRECISION"] = 9] = "PRECISION";
    INDEX_INDEX[INDEX_INDEX["CHANGE"] = 10] = "CHANGE";
    INDEX_INDEX[INDEX_INDEX["PERCHANGE"] = 11] = "PERCHANGE";
})(INDEX_INDEX || (INDEX_INDEX = {}));
// ==================== DEPTH INDEX CONSTANTS ====================
var DEPTH_INDEX;
(function (DEPTH_INDEX) {
    DEPTH_INDEX[DEPTH_INDEX["MULTIPLIER"] = 32] = "MULTIPLIER";
    DEPTH_INDEX[DEPTH_INDEX["PRECISION"] = 33] = "PRECISION";
})(DEPTH_INDEX || (DEPTH_INDEX = {}));
// ==================== STRING INDEX CONSTANTS ====================
var STRING_INDEX;
(function (STRING_INDEX) {
    STRING_INDEX[STRING_INDEX["NAME"] = 51] = "NAME";
    STRING_INDEX[STRING_INDEX["SYMBOL"] = 52] = "SYMBOL";
    STRING_INDEX[STRING_INDEX["EXCHG"] = 53] = "EXCHG";
    STRING_INDEX[STRING_INDEX["TSYMBOL"] = 54] = "TSYMBOL";
})(STRING_INDEX || (STRING_INDEX = {}));
// ==================== SCRIP MAPPING ====================
const SCRIP_MAPPING = [
    new DataType("ftm0", FieldTypes.DATE), // 0
    new DataType("dtm1", FieldTypes.DATE), // 1
    new DataType("fdtm", FieldTypes.DATE), // 2
    new DataType("ltt", FieldTypes.DATE), // 3
    new DataType("v", FieldTypes.LONG), // 4 (SCRIP_INDEX.VOLUME)
    new DataType("ltp", FieldTypes.FLOAT32), // 5 (SCRIP_INDEX.LTP)
    new DataType("ltq", FieldTypes.LONG), // 6
    new DataType("tbq", FieldTypes.LONG), // 7
    new DataType("tsq", FieldTypes.LONG), // 8
    new DataType("bp", FieldTypes.FLOAT32), // 9
    new DataType("sp", FieldTypes.FLOAT32), // 10
    new DataType("bq", FieldTypes.LONG), // 11
    new DataType("bs", FieldTypes.LONG), // 12
    new DataType("ap", FieldTypes.FLOAT32), // 13 (SCRIP_INDEX.VWAP)
    new DataType("lo", FieldTypes.FLOAT32), // 14
    new DataType("h", FieldTypes.FLOAT32), // 15
    new DataType("lcl", FieldTypes.FLOAT32), // 16
    new DataType("ucl", FieldTypes.FLOAT32), // 17
    new DataType("yh", FieldTypes.FLOAT32), // 18
    new DataType("yl", FieldTypes.FLOAT32), // 19
    new DataType("op", FieldTypes.FLOAT32), // 20
    new DataType("c", FieldTypes.FLOAT32), // 21 (SCRIP_INDEX.CLOSE)
    new DataType("oi", FieldTypes.LONG), // 22
    new DataType("mul", FieldTypes.LONG), // 23 (SCRIP_INDEX.MULTIPLIER)
    new DataType("prec", FieldTypes.LONG), // 24 (SCRIP_INDEX.PRECISION)
    new DataType("cng", FieldTypes.FLOAT32), // 25 (SCRIP_INDEX.CHANGE)
    new DataType("nc", FieldTypes.STRING), // 26 (SCRIP_INDEX.PERCHANGE)
    new DataType("to", FieldTypes.FLOAT32), // 27 (SCRIP_INDEX.TURNOVER)
];
// String fields at specific indices
SCRIP_MAPPING[STRING_INDEX.NAME] = new DataType("name", FieldTypes.STRING); // 51
SCRIP_MAPPING[STRING_INDEX.SYMBOL] = new DataType("tk", FieldTypes.STRING); // 52
SCRIP_MAPPING[STRING_INDEX.EXCHG] = new DataType("e", FieldTypes.STRING); // 53
SCRIP_MAPPING[STRING_INDEX.TSYMBOL] = new DataType("ts", FieldTypes.STRING); // 54
// ==================== INDEX MAPPING ====================
const INDEX_MAPPING = [
    new DataType("ftm0", FieldTypes.DATE), // 0
    new DataType("dtm1", FieldTypes.DATE), // 1
    new DataType("iv", FieldTypes.FLOAT32), // 2 (INDEX_INDEX.LTP)
    new DataType("ic", FieldTypes.FLOAT32), // 3 (INDEX_INDEX.CLOSE)
    new DataType("tvalue", FieldTypes.DATE), // 4
    new DataType("highPrice", FieldTypes.FLOAT32), // 5
    new DataType("lowPrice", FieldTypes.FLOAT32), // 6
    new DataType("openingPrice", FieldTypes.FLOAT32), // 7
    new DataType("mul", FieldTypes.LONG), // 8 (INDEX_INDEX.MULTIPLIER)
    new DataType("prec", FieldTypes.LONG), // 9 (INDEX_INDEX.PRECISION)
    new DataType("cng", FieldTypes.FLOAT32), // 10 (INDEX_INDEX.CHANGE)
    new DataType("nc", FieldTypes.STRING), // 11 (INDEX_INDEX.PERCHANGE)
];
// String fields at specific indices
INDEX_MAPPING[STRING_INDEX.NAME] = new DataType("name", FieldTypes.STRING); // 51
INDEX_MAPPING[STRING_INDEX.SYMBOL] = new DataType("tk", FieldTypes.STRING); // 52
INDEX_MAPPING[STRING_INDEX.EXCHG] = new DataType("e", FieldTypes.STRING); // 53
INDEX_MAPPING[STRING_INDEX.TSYMBOL] = new DataType("ts", FieldTypes.STRING); // 54
// ==================== DEPTH MAPPING ====================
const DEPTH_MAPPING = [];
DEPTH_MAPPING[0] = new DataType("ftm0", FieldTypes.DATE);
DEPTH_MAPPING[1] = new DataType("dtm1", FieldTypes.DATE);
DEPTH_MAPPING[2] = new DataType("bp", FieldTypes.FLOAT32);
DEPTH_MAPPING[3] = new DataType("bp1", FieldTypes.FLOAT32);
DEPTH_MAPPING[4] = new DataType("bp2", FieldTypes.FLOAT32);
DEPTH_MAPPING[5] = new DataType("bp3", FieldTypes.FLOAT32);
DEPTH_MAPPING[6] = new DataType("bp4", FieldTypes.FLOAT32);
DEPTH_MAPPING[7] = new DataType("sp", FieldTypes.FLOAT32);
DEPTH_MAPPING[8] = new DataType("sp1", FieldTypes.FLOAT32);
DEPTH_MAPPING[9] = new DataType("sp2", FieldTypes.FLOAT32);
DEPTH_MAPPING[10] = new DataType("sp3", FieldTypes.FLOAT32);
DEPTH_MAPPING[11] = new DataType("sp4", FieldTypes.FLOAT32);
DEPTH_MAPPING[12] = new DataType("bq", FieldTypes.LONG);
DEPTH_MAPPING[13] = new DataType("bq1", FieldTypes.LONG);
DEPTH_MAPPING[14] = new DataType("bq2", FieldTypes.LONG);
DEPTH_MAPPING[15] = new DataType("bq3", FieldTypes.LONG);
DEPTH_MAPPING[16] = new DataType("bq4", FieldTypes.LONG);
DEPTH_MAPPING[17] = new DataType("bs", FieldTypes.LONG);
DEPTH_MAPPING[18] = new DataType("bs1", FieldTypes.LONG);
DEPTH_MAPPING[19] = new DataType("bs2", FieldTypes.LONG);
DEPTH_MAPPING[20] = new DataType("bs3", FieldTypes.LONG);
DEPTH_MAPPING[21] = new DataType("bs4", FieldTypes.LONG);
DEPTH_MAPPING[22] = new DataType("bno1", FieldTypes.LONG);
DEPTH_MAPPING[23] = new DataType("bno2", FieldTypes.LONG);
DEPTH_MAPPING[24] = new DataType("bno3", FieldTypes.LONG);
DEPTH_MAPPING[25] = new DataType("bno4", FieldTypes.LONG);
DEPTH_MAPPING[26] = new DataType("bno5", FieldTypes.LONG);
DEPTH_MAPPING[27] = new DataType("sno1", FieldTypes.LONG);
DEPTH_MAPPING[28] = new DataType("sno2", FieldTypes.LONG);
DEPTH_MAPPING[29] = new DataType("sno3", FieldTypes.LONG);
DEPTH_MAPPING[30] = new DataType("sno4", FieldTypes.LONG);
DEPTH_MAPPING[31] = new DataType("sno5", FieldTypes.LONG);
DEPTH_MAPPING[DEPTH_INDEX.MULTIPLIER] = new DataType("mul", FieldTypes.LONG); // 32
DEPTH_MAPPING[DEPTH_INDEX.PRECISION] = new DataType("prec", FieldTypes.LONG); // 33
// String fields at specific indices
DEPTH_MAPPING[STRING_INDEX.NAME] = new DataType("name", FieldTypes.STRING); // 51
DEPTH_MAPPING[STRING_INDEX.SYMBOL] = new DataType("tk", FieldTypes.STRING); // 52
DEPTH_MAPPING[STRING_INDEX.EXCHG] = new DataType("e", FieldTypes.STRING); // 53
DEPTH_MAPPING[STRING_INDEX.TSYMBOL] = new DataType("ts", FieldTypes.STRING); // 54

export { SCRIP_INDEX, INDEX_INDEX, DEPTH_INDEX, STRING_INDEX, SCRIP_MAPPING, INDEX_MAPPING, DEPTH_MAPPING };