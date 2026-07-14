// ==================== ENUMS ====================
var FieldTypes;
(function (FieldTypes) {
    FieldTypes[FieldTypes["FLOAT32"] = 1] = "FLOAT32";
    FieldTypes[FieldTypes["LONG"] = 2] = "LONG";
    FieldTypes[FieldTypes["DATE"] = 3] = "DATE";
    FieldTypes[FieldTypes["STRING"] = 4] = "STRING";
})(FieldTypes || (FieldTypes = {}));
var RespTypes;
(function (RespTypes) {
    RespTypes[RespTypes["SNAP"] = 83] = "SNAP";
    RespTypes[RespTypes["UPDATE"] = 85] = "UPDATE";
})(RespTypes || (RespTypes = {}));
var TopicTypes;
(function (TopicTypes) {
    TopicTypes["SCRIP"] = "sf";
    TopicTypes["INDEX"] = "if";
    TopicTypes["DEPTH"] = "dp";
})(TopicTypes || (TopicTypes = {}));
var BinRespStat;
(function (BinRespStat) {
    BinRespStat["OK"] = "K";
    BinRespStat["NOT_OK"] = "N";
})(BinRespStat || (BinRespStat = {}));
var STAT;
(function (STAT) {
    STAT["OK"] = "Ok";
    STAT["NOT_OK"] = "NotOk";
})(STAT || (STAT = {}));
var BinRespTypes;
(function (BinRespTypes) {
    BinRespTypes[BinRespTypes["CONNECTION_TYPE"] = 1] = "CONNECTION_TYPE";
    BinRespTypes[BinRespTypes["THROTTLING_TYPE"] = 2] = "THROTTLING_TYPE";
    BinRespTypes[BinRespTypes["ACK_TYPE"] = 3] = "ACK_TYPE";
    BinRespTypes[BinRespTypes["SUBSCRIBE_TYPE"] = 4] = "SUBSCRIBE_TYPE";
    BinRespTypes[BinRespTypes["UNSUBSCRIBE_TYPE"] = 5] = "UNSUBSCRIBE_TYPE";
    BinRespTypes[BinRespTypes["DATA_TYPE"] = 6] = "DATA_TYPE";
    BinRespTypes[BinRespTypes["CHPAUSE_TYPE"] = 7] = "CHPAUSE_TYPE";
    BinRespTypes[BinRespTypes["CHRESUME_TYPE"] = 8] = "CHRESUME_TYPE";
    BinRespTypes[BinRespTypes["SNAPSHOT"] = 9] = "SNAPSHOT";
    BinRespTypes[BinRespTypes["OPC_SUBSCRIBE"] = 10] = "OPC_SUBSCRIBE";
})(BinRespTypes || (BinRespTypes = {}));
var RespCodes;
(function (RespCodes) {
    RespCodes[RespCodes["SUCCESS"] = 200] = "SUCCESS";
    RespCodes[RespCodes["CONNECTION_FAILED"] = 11001] = "CONNECTION_FAILED";
    RespCodes[RespCodes["CONNECTION_INVALID"] = 11002] = "CONNECTION_INVALID";
    RespCodes[RespCodes["SUBSCRIPTION_FAILED"] = 11011] = "SUBSCRIPTION_FAILED";
    RespCodes[RespCodes["UNSUBSCRIPTION_FAILED"] = 11012] = "UNSUBSCRIPTION_FAILED";
    RespCodes[RespCodes["SNAPSHOT_FAILED"] = 11013] = "SNAPSHOT_FAILED";
    RespCodes[RespCodes["CHANNELP_FAILED"] = 11031] = "CHANNELP_FAILED";
    RespCodes[RespCodes["CHANNELR_FAILED"] = 11032] = "CHANNELR_FAILED";
})(RespCodes || (RespCodes = {}));
// ==================== CONST OBJECTS ====================
const Keys = {
    TYPE: 'type',
    USER_ID: 'userId',
    SESSION_ID: 'Sid',
    SCRIPS: 'scrips',
    CHANNEL_NUM: 'channelNum',
    CHANNEL_NUMS: 'channelNums',
    JWT: 'jwt',
    REDIS_KEY: 'redisKey',
    STK_PRC: 'stkPrc',
    HIGH_STK: 'highStk',
    LOW_STK: 'lowStk',
    OPC_KEY: 'opcKey',
    AUTORIZATION: 'Authorization',
    SID: 'sid',
    X_ACCESS_TOKEN: 'x-access-token',
    SOURCE: 'source',
};
const ReqTypeValues = {
    CONNECTION: 'cn',
    SCRIP_SUBS: 'mws',
    SCRIP_UNSUBS: 'mwu',
    INDEX_SUBS: 'ifs',
    INDEX_UNSUBS: 'ifu',
    DEPTH_SUBS: 'dps',
    DEPTH_UNSUBS: 'dpu',
    CHANNEL_RESUME: 'cr',
    CHANNEL_PAUSE: 'cp',
    SNAP_MW: 'mwsp',
    SNAP_DP: 'dpsp',
    SNAP_IF: 'ifsp',
    OPC_SUBS: 'opc',
    THROTTLING_INTERVAL: 'ti',
    STR: 'str',
    FORCE_CONNECTION: 'fcn',
    LOG: 'log',
};
const RespTypeValues = {
    CONN: 'cn',
    SUBS: 'sub',
    UNSUBS: 'unsub',
    SNAP: 'snap',
    CHANNELR: 'cr',
    CHANNELP: 'cp',
    OPC: 'opc',
};
const SCRIP_INDEX = 0;
const INDEX_INDEX = 1;
const DEPTH_INDEX = 2;
const STRING_INDEX = 3;
const DEPTH_PREFIX = 'dp';
const SCRIP_PREFIX = 'sf';
const INDEX_PREFIX = 'if';
// ==================== INTERFACES ====================
class DataType {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }
}
// ==================== CONSTANTS ====================
const MAX_SCRIPS = 100;
const TRASH_VAL = -2147483648;
const LIB_VERSION = '3.0.0';

export {
    FieldTypes, RespTypes, TopicTypes, BinRespStat, STAT, BinRespTypes, RespCodes,
    Keys, ReqTypeValues, RespTypeValues,
    SCRIP_INDEX, INDEX_INDEX, DEPTH_INDEX, STRING_INDEX,
    DEPTH_PREFIX, SCRIP_PREFIX, INDEX_PREFIX,
    DataType, MAX_SCRIPS, TRASH_VAL, LIB_VERSION
};