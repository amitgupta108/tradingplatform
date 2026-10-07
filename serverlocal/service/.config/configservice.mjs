import  { services, modes, providers} from '../../utils/constants.mjs';
import { SystemService } from '../system/service.mjs'

export class ConfigService extends SystemService
{
    constructor(name)
    {
        super(name);
    }
    
    static async init()
    {
        this.services = services;
        this.modes = modes;
        this.providers = providers;

        for(const [k, v] of Object.entries(this.services)) {
            if (v.init === 'Y') {
                const module  = await import(v.filepath);
                this.services[k].ref = new module[v.classdef](k);
            }
        }
        this.initialized = true;
    }
    
    static async initializeAll() 
    {
        await this.init();
        const list = Object.entries(this.services);
        list.forEach(([k, v]) => {
            if (v.init === 'Y' && k !== 'CONFIGSERVICE')
                this.doInit(v.ref);
        });
    }

    static doInit(service) 
    {
        try {
            const p = service.init();

            if (p !== undefined) {
                if (p instanceof Promise)
                    p.then((response) => console.log('init message ' + service.name + ' ' + response?.status))
                        .catch((error) => console.error('init async error ' + service.name + ' ' + error?.reason));
                else
                    console.log(service.name + ' ' + p?.status);
            }
        } catch (exception) {
            console.error('init sync error ' + service.name + ' ' + exception);
        }
    }

    static getServiceByName(name)
    {
        return this.services[name].ref;
    }

    static getKeyByFeature(name, feature) 
    {
        const entry = Object.entries(this.providers[feature]).find(([k, v]) => {
            return v === name;
        });

        if(entry !== undefined)
            return entry[0];
    }

    static getActiveServiceByMode(feature, mode) 
    {
        const v = this.modes[mode];    
        const provider_key = v[feature];
        const provider_name = this.providers[feature][provider_key];
        if (this.services[provider_name]?.init === 'Y')
            return this.services[provider_name].ref;
    }

    static getAdminService(mode, feature) {
        const v = this.modes[mode];
        const provider_keys = v['admin'];
        const provider_name = this.providers['admin'][feature];
        if (this.services[provider_name]?.init === 'Y' && provider_keys.includes(feature))
            return this.services[provider_name].ref;
    }

    static getProfile(mode) {
        return this.modes[mode];
    }

    static getFeatureMode(mode, feature) {
        return this.modes[mode][feature];
    }

    static getModesForService(name, feature) 
    {
        const providerkey = this.getKeyByFeature(name, feature);
        const partner_keys = [];
        const fModes = Object.entries(this.modes).filter(([k, v]) => {
            if (v[feature] === providerkey) {
                partner_keys.push(k);
                return true;
            }
            return false;
        });

        return partner_keys;
    }

    static getParentModes(feature, feature_modes)
    {
        return Object.entries(this.modes).flatMap(([k, v]) => {
            
            const match = Object.entries(v).filter(([f, service_key]) => {
                return feature === f
                    && feature_modes.includes(service_key);
            });

            return match.length > 0 ? [k] : [];
        });
    }
}