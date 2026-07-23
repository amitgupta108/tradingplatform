import { TopicData } from './TopicData.js';
import { SCRIP_INDEX, SCRIP_MAPPING } from '../constants/mappings.js';
import { TopicTypes, FieldTypes } from '../types/types.js';
import { buf2Float, buf2Long, buf2String, getFormatDate } from '../utils/binary.js';

class ScripTopicData extends TopicData {
    constructor() {
        // Call the parent class (TopicData) constructor with the required feedType
        super(TopicTypes.SCRIP);
    }

    setMultiplierAndPrec() {
        if (this.updatedFieldsArray[SCRIP_INDEX.PRECISION]) {
            this.precision = this.fieldDataArray[SCRIP_INDEX.PRECISION];
            this.precisionValue = Math.pow(10, this.precision);
        }
        if (this.updatedFieldsArray[SCRIP_INDEX.MULTIPLIER]) {
            this.multiplier = this.fieldDataArray[SCRIP_INDEX.MULTIPLIER];
        }
    }

    prepareData() {
        this.prepareCommonData();

        // Calculate Price Change and Percentage Change
        if (this.updatedFieldsArray[SCRIP_INDEX.LTP] || this.updatedFieldsArray[SCRIP_INDEX.CLOSE]) {
            const ltp = this.fieldDataArray[SCRIP_INDEX.LTP];
            const close = this.fieldDataArray[SCRIP_INDEX.CLOSE];

            if (ltp !== undefined && close !== undefined) {
                const change = ltp - close;
                this.fieldDataArray[SCRIP_INDEX.CHANGE] = change;
                this.updatedFieldsArray[SCRIP_INDEX.CHANGE] = true;

                this.fieldDataArray[SCRIP_INDEX.PERCHANGE] = ((change / close) * 100).toFixed(this.precision);
                this.updatedFieldsArray[SCRIP_INDEX.PERCHANGE] = true;
            }
        }

        // Calculate Traded Turnover
        if (this.updatedFieldsArray[SCRIP_INDEX.VOLUME] || this.updatedFieldsArray[SCRIP_INDEX.VWAP]) {
            const volume = this.fieldDataArray[SCRIP_INDEX.VOLUME];
            const vwap = this.fieldDataArray[SCRIP_INDEX.VWAP];

            if (volume !== undefined && vwap !== undefined) {
                this.fieldDataArray[SCRIP_INDEX.TURNOVER] = volume * vwap;
                this.updatedFieldsArray[SCRIP_INDEX.TURNOVER] = true;
            }
        }

        // Map fields to JSON response
        const jsonRes = {};
        for (let index = 0; index < SCRIP_MAPPING.length; index++) {
            const dataType = SCRIP_MAPPING[index];
            let val = this.fieldDataArray[index];

            if (this.updatedFieldsArray[index] && val !== undefined && dataType) {
                if (dataType.type === FieldTypes.FLOAT32) {
                    val = (val / (this.multiplier * this.precisionValue)).toFixed(this.precision);
                } else if (dataType.type === FieldTypes.DATE) {
                    val = getFormatDate(val);
                }
                jsonRes[dataType.name] = val.toString();
            }
        }

        // Reset the tracking array for the next data cycle
        this.updatedFieldsArray = [];
        return jsonRes;
    }
}
export { ScripTopicData };