import { ConfigService } from "../service/config/configservice.mjs";
import { Configurations } from "../service/config/configurations.js";
import type { IExpiries } from "../utils/types.js";

export class DataApi {
    passthrough: boolean = false;

    constructor() {

    }

    async getExpiries(options: any) {
        const config = ConfigService.getServiceByName('CONFIGURATIONS') as Configurations;
        return config.getExpiries(options?.stockCode, options?.type);
    }

    async getHistory(request: any, appid: string | undefined) {
        const commonUtils = ConfigService.getServiceByName('COMMONSERVICE') as any;
        return commonUtils.history(request, appid);
    }

    async getScrips(filters: any) {
        const scripstore = ConfigService.getServiceByName('SCRIPSTORE') as any;
        return scripstore.getScrips(filters);
    }

    async getValues(provider: string) {
        const authservice = ConfigService.getServiceByName('AUTHSERVICE') as any;
        return authservice.authData(provider);
    }
}