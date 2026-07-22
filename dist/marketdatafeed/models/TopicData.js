import { TopicTypes, TRASH_VAL } from '../types/types.js';
import {SCRIP_INDEX, INDEX_INDEX, DEPTH_INDEX, STRING_INDEX} from '../constants/mappings.js';

/**
 * Factory for creating typed topic data instances from binary data.
 */
class TopicData {
    constructor(feedType) {
        this.feedType = feedType;
        this.exchange = null;
        this.symbol = null;
        this.tSymbol = null;
        this.multiplier = 1;
        this.precision = 2;
        this.precisionValue = 100;
        this.jsonArray = null;
        this.fieldDataArray = [];
        this.updatedFieldsArray = [];

        this.fieldDataArray[STRING_INDEX.NAME] = feedType;
    }

    getKey() {
        // Note: Fixed a likely bug in original code by changing 'exchange' to 'this.exchange'
        return this.exchange.concat("|", this.symbol);
    }

    setLongValues(index, value) {
        if (this.fieldDataArray[index] != value && value != TRASH_VAL) {
            this.fieldDataArray[index] = value;
            this.updatedFieldsArray[index] = true;
        }
    }

    clearFieldDataArray() {
        this.fieldDataArray.length = 0;
        this.updatedFieldsArray.length = 0;
    }

    setStringValues(index, value) {
        switch (index) {
            case STRING_INDEX.SYMBOL:
                this.symbol = value;
                this.fieldDataArray[STRING_INDEX.SYMBOL] = value;
                break;
            case STRING_INDEX.EXCHG:
                this.exchange = value;
                this.fieldDataArray[STRING_INDEX.EXCHG] = value;
                break;
            case STRING_INDEX.TSYMBOL:
                this.tSymbol = value;
                this.fieldDataArray[STRING_INDEX.TSYMBOL] = value;
                this.updatedFieldsArray[STRING_INDEX.TSYMBOL] = true;
                break;
        }
    }

    prepareCommonData() {
        this.updatedFieldsArray[STRING_INDEX.NAME] = true;  //51
        this.updatedFieldsArray[STRING_INDEX.EXCHG] = true; //52
        this.updatedFieldsArray[STRING_INDEX.SYMBOL] = true;//53 
    }
}

export { TopicData };

