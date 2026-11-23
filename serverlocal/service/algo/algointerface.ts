import { UserService } from "../system/service.js";
import { ConfigService } from "../config/configservice.mjs";
import { EventService } from "../system/eventservice.js";

export class AlgoInterface extends UserService {
    es: EventService | null = null;
    algos: Map<string, AlgoInstance> | null = null;
    algonames: string[];

    constructor(name: string) {
        super(name);
        this.algonames = ['SLORDER'];
    }

    async init() {
        if (!this.initialized) {
            this.es = ConfigService.getServiceByName('EVENTSERVICE');
            this.es?.addListener('algo_connect', (name: string, algoport: Worker) => {
                this.handleConnection(name, algoport);
            });
            this.initialized = true;
        }
        return { status: 'already initialized' }
    }

    async handleConnection(name: string, algoport: Worker) {
        if (this.algonames.includes(name)) {
            algoport.addEventListener('message', (msg: any) => {
                if (msg.data === 'Y') {
                    const algo = new AlgoInstance(name, algoport);
                    algo.init();
                    this.algos?.set(name, algo);
                }
            });
            algoport.postMessage({ type: 'init', data: {} });
        }
    }

    async tearDown(): Promise<boolean> {
        return true;
    }
}

export class AlgoInstance {
    name: string;
    port: Worker;
    state: string = 'disconnected';

    constructor(name: string, port: Worker) {
        this.name = name;
        this.port = port;
    }

    async init() {
        this.state = 'initialized';
    }

    async handleMessage(message: any) {

    }
}