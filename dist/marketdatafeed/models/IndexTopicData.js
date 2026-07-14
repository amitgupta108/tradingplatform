import { TopicData } from './TopicData.js';
import { INDEX_INDEX, INDEX_MAPPING } from '../constants/mappings.js';
import { TopicTypes, FieldTypes } from '../types/types.js';
import { buf2Float, buf2Long, buf2String, getFormatDate } from '../utils/binary.js';

/**
 * Parses binary index topic data updates from the Kotak WebSocket protocol.
 */
class IndexTopicData extends TopicData {
    constructor() {
        // Call the parent class (TopicData) constructor with the Index topic type
        super(TopicTypes.INDEX);
    }

    setMultiplierAndPrec() {
        if (this.updatedFieldsArray[INDEX_INDEX.PRECISION]) {
            this.precision = this.fieldDataArray[INDEX_INDEX.PRECISION];
            this.precisionValue = Math.pow(10, this.precision);
        }
        if (this.updatedFieldsArray[INDEX_INDEX.MULTIPLIER]) {
            this.multiplier = this.fieldDataArray[INDEX_INDEX.MULTIPLIER];
        }
    }

    prepareData() {
        this.prepareCommonData();

        // Calculate Index Change and Percentage Change
        if (this.updatedFieldsArray[INDEX_INDEX.LTP] || this.updatedFieldsArray[INDEX_INDEX.CLOSE]) {
            const ltp = this.fieldDataArray[INDEX_INDEX.LTP];
            const close = this.fieldDataArray[INDEX_INDEX.CLOSE];

            if (ltp !== undefined && close !== undefined) {
                const change = ltp - close;
                this.fieldDataArray[INDEX_INDEX.CHANGE] = change;
                this.updatedFieldsArray[INDEX_INDEX.CHANGE] = true;

                this.fieldDataArray[INDEX_INDEX.PERCHANGE] = ((change / close) * 100).toFixed(this.precision);
                this.updatedFieldsArray[INDEX_INDEX.PERCHANGE] = true;
            }
        }

        // Map fields to JSON response
        const jsonRes = {};
        for (let index = 0; index < INDEX_MAPPING.length; index++) {
            const dataType = INDEX_MAPPING[index];
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

        // Reset tracking array for the next data stream block
        this.updatedFieldsArray = [];
        return jsonRes;
    }
}
export { IndexTopicData };