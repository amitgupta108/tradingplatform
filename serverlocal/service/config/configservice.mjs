import { services, modes, providers } from '../../utils/constants.js';

export class ConfigService {

    static className = 'CONFIGSERVICE';
    static logEnabled = true;
    static services = services;
    static modes = modes;
    static providers = providers;
    static initialized = false;

    static log(...args) {
        if (this.logEnabled) {
            console.log(`[${this.className}]`, ...args);
        }
    }

    static error(...args) {
        if (this.logEnabled) {
            console.error(`[${this.className}]`, ...args);
        }
    }

    static async initializeAll() {

        const list = Array.from(Object.entries(this.services)).filter(([k, v]) => {
            return v.init === 'Y';
        });

        for (const [k, v] of list) {
            const module = await import(v.filepath);
            this.services[k].ref = new module[v.classdef](k);
        }

        return list.map(async ([k, v]) => {
            return await this.doInit(this.services[k].ref);
        });
    }

    static async doInit(service) {
        try {
            var p = await service.init();

            if (p !== undefined) {
                if (p instanceof Promise)
                    p.then((response) => this.log('init message ' + service.name + ' ' + response?.status))
                        .catch((error) => this.error('init async error ' + service.name + ' ' + error?.reason));
                else
                    this.log(service.name + ' ' + p?.status);
            }
        } catch (exception) {
            this.error('init sync error ' + service.name + ' ' + exception);
        }
        return p;
    }

    static getServiceByName(name) {
        return this.services[name].ref;
    }

    static getKeyByFeature(name, feature) {
        const entry = Object.entries(this.providers[feature]).find(([k, v]) => {
            return v === name;
        });

        if (entry !== undefined)
            return entry[0];
    }

    static getActiveServiceByMode(feature, mode) {
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

    static getPartnerFeatureServices(servicename, feature, partnerfeature) {
        const providerkey = this.getKeyByFeature(servicename, feature);

        return Object.entries(this.modes).map(([k, v]) => {
            if (v[feature] === providerkey)
                return v[partnerfeature];
        }).filter(x => x !== undefined)
            .map(p => {
                const service_name = this.providers[partnerfeature][p];
                return [p, this.getServiceByName(service_name)];
            });
    }

    static getModesForService(name, feature) {
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

    static getParentModes(feature, feature_modes) {
        return Object.entries(this.modes).flatMap(([k, v]) => {

            const match = Object.entries(v).filter(([f, service_key]) => {
                return feature === f
                    && feature_modes.includes(service_key);
            });

            return match.length > 0 ? [k] : [];
        });
    }
}