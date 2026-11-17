import { Worker, parentPort } from 'node:worker_threads';
import path from 'path';

type MessageType = "action" | "inputdata" | "outputdata";
type Message = { type: MessageType, value: string };

export class SubProcess {
    private processfile: string;
    private self?: Worker;
    private parent?: typeof parentPort;

    constructor(file: string) {
        this.processfile = file;
        this.parent = parentPort;
    }

    init(): void {
        const filedir = process.env.PROCESSES + '/';
        this.self = new Worker(path.join(filedir, this.processfile));

        this.parent?.on('message', (message: Message) => {
            if (message.type === 'action')
                this.actionMessage(message);
            else if (message.type === 'inputdata')
                this.handleData(message);
        });
    }

    actionMessage(message: Message) {
        if (message.value == "start")
            this.start();
        else if (message.value == "stop")
            this.stop();
    }

    handleData(message: Message) {

    }

    start(): void {
        this.sendMessage({ type: 'outputdata', value: 'history' });
    }

    stop(): void {
        this.sendMessage({ type: 'outputdata', value: 'stop' });
    }

    sendMessage(message: Message) {
        this.self?.postMessage(message);
    }

}
