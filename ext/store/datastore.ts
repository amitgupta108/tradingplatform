import { makeVector, Vector } from 'apache-arrow';

export class DataStore {

    historyCandles?: Vector;
    constructor() {

    }

    storeHistory(history: number[]) {
        this.historyCandles = makeVector(new Int32Array(history as number[]));
    }
}