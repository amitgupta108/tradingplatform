import { SystemService } from "../system/service.js";

export class TSConfigService extends SystemService {
    constructor() {
        super('TSCONFIG')
    }

    async initialize(list: string[]) {

    }

    async tearDown(): Promise<any> {
        return true;
    }
}