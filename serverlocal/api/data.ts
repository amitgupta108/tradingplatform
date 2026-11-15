import { ConfigService } from "../service/config/configservice.mjs";
import { Configurations } from "../service/config/configurations.js";
import type { IExpiries } from "../utils/types.js";

export class DataApi {
    passthrough: boolean = false;
    constructor() {
        this.passthrough = process.env.PASSTHROUGH === 'Y' ? true : false;
    }

    async getExpiries(options: any) {
        if (this.passthrough) {
            const commonUtils = ConfigService.getServiceByName('COMMONSERVICE') as any;
            return commonUtils.tpExpiries(options?.stockCode, options?.type);
        }
        const config = ConfigService.getServiceByName('CONFIGURATIONS') as Configurations;
        return config.getExpiries(options?.stockCode, options?.type);
    }

    async getHistory(request: any, appid: string | undefined) {
        const commonUtils = ConfigService.getServiceByName('COMMONSERVICE') as any;
        if (this.passthrough || appid === undefined)
            return commonUtils.tpHistory(request);
        else
            return commonUtils.history(appid, request);
    }

    async getScrips(filters: any) {
        if (this.passthrough) {
            const commonUtils = ConfigService.getServiceByName('COMMONSERVICE') as any;
            return commonUtils.tpScrips(filters);
        }
        const scripstore = ConfigService.getServiceByName('SCRIPSTORE') as any;
        return scripstore.getScrips(filters);
    }

    async getValues(provider: string) {
        if (this.passthrough) {
            const commonUtils = ConfigService.getServiceByName('COMMONSERVICE') as any;
            return commonUtils.tpValues(provider);
        }
        const authservice = ConfigService.getServiceByName('AUTHSERVICE') as any;
        return authservice.authData(provider);
    }
}