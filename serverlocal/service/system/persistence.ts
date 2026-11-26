import { open } from 'lmdb';
import { SystemService } from "../../../common/service.js";
import { DIST_PATH } from '../../../common/path.js';

export class PersistenceService extends SystemService {
    store: any;
    constructor(name: string) {
        super(name);
        this.store;
    }

    async init() {
        this.store = open(DIST_PATH + '/' + process.env.DB_RELATIVE_FILEPATH, {});
        this.initialized = true;
        return { status: 'success' };
    }

    getString(key: string) {
        return this.store.get(key);
    }

    async setString(key: string, value: string) {
        return await this.store.put(key, value);
    }

    getData(key: string) {
        const data = this.store.get(key);
        if (data !== undefined)
            return JSON.parse(data);
    }

    async setData(key: string, value: any) {
        return await this.store.put(key, JSON.stringify(value));
    }

    async tearDown(): Promise<any> {
        return true;
    }
}