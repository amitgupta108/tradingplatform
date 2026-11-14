import { ConfigService } from "./configservice.mjs";
import type { TExpiriesSet, IExpiries, AuthData } from '../../utils/types.js';
import { EXCHANGES, STOCKCODES } from "../../utils/constants.js";
import { KotakAdapter } from "../../broker/clients/KotakAdapter.js";
import { UserService } from "../system/service.js";

export class Configurations extends UserService {
    expiries: TExpiriesSet = {};
    initialized: boolean = false;
    kotakadaper!: KotakAdapter;

    constructor() {
        super('CONFIGURATIONS');
    }

    async cInit() {
        const es = ConfigService.getServiceByName('EVENTSERVICE');
        es.addListener('kotak_auth', async (authdata: AuthData) => {
            await this.onAuthData(authdata);
        });
    }

    async onAuthData(authData: AuthData) {
        const af = ConfigService.getServiceByName('ADAPTERFACTORY');
        this.kotakadaper = af.getAdapter('KOTAKADAPTER');
        this.kotakadaper.initiateConnect(authData);

        const ps = ConfigService.getServiceByName('PERSISTSERVICE');
        for (const stock of STOCKCODES) {
            this.expiries[stock] = ps.getData(`${stock}_EXPIRIES`) as IExpiries;
            this.log(JSON.stringify(this.expiries[stock], null, 2));

            if (this.expiries[stock]['options'].length === 0 || new Date(this.expiries[stock]['options'][0]).getTime() < Date.now()) {
                this.expiries[stock] = {} as IExpiries;
                this.expiries[stock]['options'] = await this.fetchExpiries(stock, 'options');
                this.expiries[stock]['futures'] = await this.fetchExpiries(stock, 'futures');
            }
            ps.setData(`${stock}_EXPIRIES`, this.expiries[stock]);
        }
        this.log(JSON.stringify(this.expiries, null, 2));
    }

    async fetchExpiries(symbol: string, type: string): Promise<string[]> {
        const params = {
            NIFTY: { exchange: EXCHANGES[symbol], underlying: 'NIFTY' },
            CRUDEOIL: { exchange: EXCHANGES[symbol], underlying: 'CRUDEOIL' },
        }
        params[symbol].instrument_type = type === 'futures' ? 'fut' : 'option';

        const response = await this.kotakadaper.get('expiries', params[symbol]);
        if (response.ok) {
            const data = await response.json();
            return data.expiries;
        }
        this.log(`Error fetching expiries for ${symbol}: ${response.statusText}`);
        return [];
    }

    getExpiry(stock: string): IExpiries | undefined {
        if (this.initialized)
            return this.expiries?.[stock];
    }

    getAllExpiries(): TExpiriesSet | undefined {
        if (this.initialized)
            return this.expiries;
    }
}