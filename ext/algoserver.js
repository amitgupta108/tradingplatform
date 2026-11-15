import { parentPort } from "node:worker_threads";
import { DataStore } from "./store/datastore.js";
class AlgoSubProcess {
    parent = parentPort;
    datastore;
    constructor() {
        this.datastore = new DataStore();
        this.parent?.on("message", (msg) => {
            this.handleMessage(msg);
        });
    }
    handleMessage(msg) {
        switch (msg.type) {
            case "history":
                this.datastore.storeHistory(msg.payload);
                break;
        }
    }
    sendMessage(msg) {
        this.parent?.postMessage(msg);
    }
}
const algoServer = new AlgoSubProcess();
