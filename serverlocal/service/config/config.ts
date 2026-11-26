import { Service } from "../../../common/service.js";
import { SystemService } from "../../../common/service.js";
import { algo_services, modes, providers } from '../../utils/constants.js';

export class TSConfigService extends SystemService {
    static instance: TSConfigService;
    services = algo_services;
    modes = modes;
    providers = providers;

    static getInstance() {
        if (!this.instance) {
            this.instance = new TSConfigService();
        }
        return this.instance;
    }

    constructor() {
        super('TSCONFIG');
        if (this.constructor.name !== 'TSConfigService') {
            throw new Error('use getInstacne() for creating/accessing singleton instance');
        }
    }

    async init() {

    }

    async initialize(names: string[]) {
        return Object.entries(this.services).filter(async ([k, v]) => {
            if (names.includes(k) && v.init === 'Y') {
                const module = await import(v.filepath);
                this.services[k].ref = new module[v.classdef](k);
                return true;
            }
        }).map(async ([k, v]) => {
            return await this.doInit(k, v)
        });
    }

    async doInit(k: string, v: any) {
        try {
            var p = await this.services[k].ref.init();
            this.log('init message ' + k + ' ' + p?.status);
        } catch (exception) {
            this.error('init error ' + k + ' ' + exception);
        }
        return p;
    }

    getServiceByName(name: string): Service | undefined {
        return undefined;
    }

    async tearDown(): Promise<any> {
        return true;
    }
}