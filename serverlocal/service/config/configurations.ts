import { ConfigService } from "./configservice.mjs";
import type { IExpiries, TExpiriesSet } from '../../utils/types.js';
import { EXCHANGES, STOCKCODES } from "../../utils/constants.js";
import { KotakAdapter } from "../../broker/clients/KotakAdapter.js";
import { UserService } from "../system/service.js";

export class Configurations extends UserService {
    expiries: TExpiriesSet = {
        'NIFTY': { 'FUTURES': [], 'OPTIONS': [] } as IExpiries,
        'CRUDEOIL': { 'FUTURES': [], 'OPTIONS': [] } as IExpiries
    };
    ps: any;

    constructor() {
        super('CONFIGURATIONS');
    }

    async cInit(): Promise<boolean> {
        return await new Promise(async (resolve, reject) => {
            this.ps = ConfigService.getServiceByName('PERSISTSERVICE');
            for (const stock of STOCKCODES) {
                for (const type of ['FUTURES', 'OPTIONS']) {
                    this.expiries[stock][type] = await this.loadExpiries(stock, type);
                }
            }
            resolve(true);
        });
    }

    private async loadExpiries(stockCode: string, type: string) {
        this.expiries[stockCode][type] = this.ps.getData(`EXPIRIES_${stockCode}_${type}'`) as string[];

        let dates: string[] | undefined;
        if (!this.expiries[stockCode][type] || this.expiries[stockCode][type].length < 2)
            dates = await this.fetchExpiries(stockCode, type)
        else if (Date.now() > (new Date(this.expiries[stockCode][type][0]).getTime() + 16 * 60 * 60 * 1000))
            dates?.shift();

        if (dates !== undefined)
            this.persistExpiries(stockCode, type, dates);
    }

    private async persistExpiries(stockCode: string, type: string, dates: string[]) {
        this.expiries[stockCode][type] = dates;
        this.ps.setData(`EXPIRIES_${stockCode}_${type}`, dates);
    }

    private async fetchExpiries(stockCode: string, type: string): Promise<string[]> {
        const adapter = await KotakAdapter.getInstance() as any as KotakAdapter;
        if (adapter.isAuthenticated) {
            const response = await adapter.get('expiries', {
                exchange: EXCHANGES[stockCode], underlying: stockCode,
                instrument_type: type === 'FUTURES' ? 'fut' : 'option'
            });
            if (response.ok)
                return (await response.json() as any)?.expiries;
            this.log(`Error fetching expiries for ${stockCode}: ${response.statusText}`);
        }
        return [];
    }

    getExpiries(stockCode: string, type: string | undefined): string[] | IExpiries {
        if (type !== undefined)
            return this.expiries[stockCode][type] as string[];
        else
            return this.expiries[stockCode] as any;
    }
}