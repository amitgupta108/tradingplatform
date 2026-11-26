import { SystemService } from "./service.js";
import { Socket, WebSocket, MessagePort } from "./import.js";

export abstract class App extends SystemService {
    constructor(name: string) {
        super(name);
    }

    abstract init(...args: any[]): Promise<any>;
    abstract startServices(names?: string[]): Promise<any>;
    abstract connect(s: Socket | WebSocket | MessagePort, id?: string): void;
    abstract send(s: Socket | WebSocket | MessagePort, type: string, data: any): void;

    catchAsync(requestName: string, fn: (...args: any[]) => Promise<any>) {
        return (...args: any[]) => {
            fn.apply(this, args)
                .catch(err => this.error(requestName, err));
        }
    };
}