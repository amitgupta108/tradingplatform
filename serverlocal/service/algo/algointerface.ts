import { UserService } from "../../../common/service.js";
import { ConfigService } from "../config/configservice.mjs";
import { EventService } from "../system/eventservice.js";

type MessageTypes = 'init' | 'connect' | 'disconnect' | 'addlistener' | 'removelistener';
type ListenerType = 'order' | 'quote' | 'pnl';
type DataType = {
    key: string;
    value: any;
}

interface TMessage {
    type: MessageTypes;
    data: DataType[];
}

export class AlgoInterface extends UserService {
    es: EventService | null = null;
    algos: Map<string, AlgoInstance> | null = null;
    algonames: string[];

    constructor(name: string) {
        super(name);
        this.algonames = ['ORDERSL'];
    }

    async init() {
        if (!this.initialized) {
            this.es = ConfigService.getServiceByName('EVENTSERVICE');
            this.es?.addListener('algo_connect', (name: string, port: MessagePort) => {
                this.handleConnection(name, port);
            });
            this.initialized = true;
        }
        return { status: 'already initialized' }
    }

    async handleConnection(name: string, port: MessagePort) {
        if (this.algonames.includes(name)) {
            port.addEventListener('message', (msg: any) => {
                if (msg.data === 'Y') {
                    const algo = new AlgoInstance(name, port);
                    algo.init();
                    this.algos?.set(name, algo);
                }
            });
            port.postMessage({ type: 'init', data: {} });
        }
    }

    async tearDown(): Promise<boolean> {
        return true;
    }
}

export class AlgoInstance {
    name: string;
    port: MessagePort;
    state: string = 'disconnected';

    constructor(name: string, port: MessagePort) {
        this.name = name;
        this.port = port;
    }

    async init() {
        this.state = 'initialized';
    }

    async handleMessage(message: any) {

    }
}