//import { open } from 'lmdb';

class PersistenceService 
{
    constructor(name)
    {
        this.name = name;
        this.store;
        this.initialized = false;
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