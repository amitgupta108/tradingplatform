import { open } from 'lmdb';

import { SystemService } from "./service.js";

export class PersistenceService extends SystemService {
    store: any;
    constructor(name: string) {
        super(name);
        this.store;
    }

    init() {
        this.store = open(process.env.workspace_location + '/' + process.env.store_location, {});
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
}