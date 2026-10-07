import { InfraService } from "../system/service.mjs"
import { ConfigService } from "../.config/configservice.mjs"

export class ServerStreamManager extends InfraService
{
    constructor(name)
    {
        super(name);
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