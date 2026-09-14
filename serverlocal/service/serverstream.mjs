import { ConfigService } from "./.config/configservice.mjs"

class ServerStreamManager 
{
    constructor(name)
    {
        this.name = name;
        this.initialized = false;
    }

    init()
    {
        this.initialized = true;
        return {status: 'initialized'};
    }

    subscribe(serverid, list, provider){
        const marketservice = ConfigService.getServiceByName(provider);
        marketservice.subscribe(serverid, list, 'subs');
    }

    unsubscribe(serverid, list, provider) {
        const marketservice = ConfigService.getServiceByName(provider);
        marketservice.subscribe(serverid, list, 'unsub');
    }
}

export const serverstream = new ServerStreamManager('SERVERSTREAM');