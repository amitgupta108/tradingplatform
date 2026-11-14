import { parentPort } from "node:worker_threads";
import { DataStore } from "./store/datastore.js";
import type { Message } from "./common/common.js";

class AlgoSubProcess {
    parent = parentPort;
    datastore: DataStore;

    constructor() {
        this.datastore = new DataStore();
        this.parent?.on("message", (msg: Message) => {
            this.handleMessage(msg)
        });
    }

    handleMessage(msg: Message) {
        switch (msg.type) {
            case "history":
                this.datastore.storeHistory(msg.payload);
                break;
        }
    }

    sendMessage(msg: string) {
        this.parent?.postMessage(msg);
    }
}

const algoServer = new AlgoSubProcess(); 