import { makeVector, Vector } from 'apache-arrow';
export class DataStore {
    historyCandles;
    constructor() {
    }
    storeHistory(history) {
        this.historyCandles = makeVector(new Int32Array(history));
    }
}
