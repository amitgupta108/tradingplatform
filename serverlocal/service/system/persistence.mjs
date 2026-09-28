//import { open } from 'lmdb';

import { SystemService } from "../service.mjs";

class PersistenceService extends SystemService
{
    constructor(name)
    {
        super(name);
        this.store;
    }

    init()
    {
        //this.store = open(process.env.workspace_location + '/' + process.env.store_location, {});
        this.initialized = true;
        return {status: 'success'};
    }

    get(key){
        return this.store.get(key);
    }

    async set(key, value){
        return await this.store.put(key, value);
    }
}

export const persistenceservice = new PersistenceService('PERSISTSERVICE');