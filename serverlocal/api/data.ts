import { ConfigService } from "../service/config/configservice.mjs";
import { Configurations } from "../service/config/configurations.js";
import type { IExpiries } from "../utils/types.js";

export class DataApi {
    constructor() {

    }

    getExpiries(stockCode: string, type: string | undefined): string[] | IExpiries {
        const config = ConfigService.getServiceByName('CONFIGURATIONS') as Configurations;
        return config.getExpiries(stockCode, type);
    }

    async getHistoryAsync(request: any) {
        const commonUtils = ConfigService.getServiceByName('COMMONSERVICE') as any;
        return commonUtils.getHistory(request.symbol, request.starttime, request.endtime, request.interval);
    }

    async getScrips(filters: any) {
        const dataService = ConfigService.getServiceByName('COMMONSERVICE') as any;
        return dataService.tpScrips(filters);
    }

    getValues(provider: string) {
        const authservice = ConfigService.getServiceByName('AUTHSERVICE') as any;
        return authservice.authData(provider);
    }
}