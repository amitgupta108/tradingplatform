import { TopicData} from './TopicData.js';
import { DEPTH_INDEX, DEPTH_MAPPING } from '../constants/mappings.js';
import { FieldTypes, TopicTypes } from '../types/types.js';
import { buf2Float, buf2Long, buf2String, getFormatDate } from '../utils/binary.js';

class DepthTopicData extends TopicData {
    constructor() {
        // Call the parent class (TopicData) constructor with the Depth topic type
        super(TopicTypes.DEPTH);
    }

    setMultiplierAndPrec() {
        if (this.updatedFieldsArray[DEPTH_INDEX.PRECISION]) {
            this.precision = this.fieldDataArray[DEPTH_INDEX.PRECISION];
            this.precisionValue = Math.pow(10, this.precision);
        }
        if (this.updatedFieldsArray[DEPTH_INDEX.MULTIPLIER]) {
            this.multiplier = this.fieldDataArray[DEPTH_INDEX.MULTIPLIER];
        }
    }

    prepareData() {
        this.prepareCommonData();
        const jsonRes = {};

        for (let index = 0; index < DEPTH_MAPPING.length; index++) {
            const mapping = DEPTH_MAPPING[index];
            let value = this.fieldDataArray[index];

            if (this.updatedFieldsArray[index] && value !== undefined && mapping) {
                if (mapping.type === FieldTypes.FLOAT32) {
                    value = (value / (this.multiplier * this.precisionValue)).toFixed(this.precision);
                } else if (mapping.type === FieldTypes.DATE) {
                    value = getFormatDate(value);
                }
                jsonRes[mapping.name] = value.toString();
            }
        }

        // Reset tracking array for the next tick/data stream update
        this.updatedFieldsArray = [];
        return jsonRes;
    }
}

export { DepthTopicData };