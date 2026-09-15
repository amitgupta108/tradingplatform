import { eventservice } from '../eventservice.mjs';
import { authservice } from '../auth/authservice.mjs';
import { scripstore } from '../scripstore.mjs';
import { ordersimulator } from '../ordersimulator.mjs';
import { serverstream } from '../serverstream.mjs';
import { TPSocket } from '../clients/TPClient.mjs';
import { m_icici_live } from '../../broker/icici/m_breeze_live.mjs';
import { m_icici_hist } from '../../broker/icici/m_breeze_hist.mjs';
import { m_openalgo_live } from '../../broker/openalgo/m_openalgo.mjs';
import { m_kotak_live } from '../../broker/kotak/m_kotak_live.mjs';
import { m_kotak_hsm } from '../../broker/kotak/m_kotak_hsm.mjs';
import { t_openalgo_trade } from '../../broker/openalgo/t_openalgo.mjs';
import { t_kotak_trade } from '../../broker/kotak/t_kotakneo.mjs';
import { m_common_service } from '../../broker/common/m_common.mjs';

const modes = {
    HISTORY: { view: 'HISTORY', trade: 'SIMULATION', admin: ['BROKER_AUTH'] },
    S1TSAB: { view: 'LIVE_1', trade: 'SIMULATION', admin: ['BROKER_AUTH'] },
    S1T1ABS: { view: 'LIVE_1', trade: 'LIVE_1', admin: ['BROKER_AUTH', 'SCRIP_STORE']},
    S1T0AS: { view: 'LIVE_1', admin: ['SCRIP_STORE'] },
    S2T1AB: { view: 'LIVE_2', trade: 'LIVE_1', admin: ['BROKER_AUTH'] },
    S2T2A0: { view: 'LIVE_2', trade: 'LIVE_2'},
    S2TSA0: { view: 'LIVE_2', trade: 'SIMULATION'},
    S3T1AB: { view: 'LIVE_3', trade: 'LIVE_1', admin: ['BROKER_AUTH']},
    S3T0A0: { view: 'LIVE_3'},
    S5T1ABS: { view: 'LIVE_5', trade: 'LIVE_1', admin: ['BROKER_AUTH','SCRIP_STORE'] },
    S6T0A0: { view: 'LIVE_6' },
    TPMODE: { admin: ['SCRIP_STORE', 'LIVE_STREAMING'] },
};

const services = {
    EVENTSERVICE: eventservice,
    AUTHSERVICE: authservice,
    SCRIPSTORE: scripstore,
    ORDERSIMULATOR: ordersimulator,
    SERVERSTREAM: serverstream,
    COMMONSERVICE: m_common_service,
    KOTAKLIVEVIEW: m_kotak_live,
    KOTAKHSMVIEW: m_kotak_hsm,
    KOTAKNEOTRADE: t_kotak_trade,
    ICICIHISTVIEW: m_icici_hist,
    ICICILIVEVIEW: m_icici_live,
    OPENALGOVIEW: m_openalgo_live,
    OPENALGOTRADE: t_openalgo_trade
};

const providers = {
    view: { LIVE_1: 'KOTAKHSMVIEW', LIVE_2: 'OPENALGOVIEW', LIVE_3: 'ICICILIVEVIEW', HISTORY: 'ICICIHISTVIEW', LIVE_5: 'KOTAKLIVEVIEW', LIVE_6: 'COMMONSERVICE'},
    trade: { LIVE_1: 'KOTAKNEOTRADE', LIVE_2: 'OPENALGOTRADE', SIMULATION: 'ORDERSIMULATOR' },
    admin: { BROKER_AUTH: 'AUTHSERVICE', SCRIP_STORE: 'SCRIPSTORE', LIVE_STREAMING: 'SERVERSTREAM' }
};

const access = {
    view: ['vix', 'startv2', 'history', 'speed', 'exit', 'stream', 'option_chain'],
    trade: ['order', 'cancelorder', 'orderbook', 'positions', 'updateorder'],
    admin: [ 'authenticate', 'scrips', 'subscribe', 'unsubscribe']
};

export class ConfigService
{
    static init()
    {
        if(process.env.PASSTHROUGH === 'Y')
        {
            this.socket_clients = new Map();
            this.socket_clients.set('TPCLIENT', new TPSocket('0ce8a0ed-c4a1-4938-940b-b4d3841468g5', 'TPMODE'));
        }
        this.initialized = true;
    }
    
    static initializeAll() 
    {
        this.init();
        const list = Object.entries(services);
        const active = list.filter(([k, v]) => {
            return process.env[k] === 'Y';
        });

        const val = active.map(([k, v]) => v);
        [...new Set(val)].forEach((v) => {
            this.doInit(v);
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
        return services[name];
    }

    static getKeyByFeature(name, feature) 
    {
        const entry = Object.entries(providers[feature]).find(([k, v]) => {
            return v === name;
        });

        if(entry !== undefined)
            return entry[0];
    }

    static getActiveServiceByMode(feature, mode) 
    {
        const v = modes[mode];    
        const provider_key = v[feature];
        const provider_name = providers[feature][provider_key];
        if (process.env[provider_name] === 'Y')
            return services[provider_name];
    }

    static getAdminService(mode, feature) {
        const v = modes[mode];
        const provider_keys = v['admin'];
        const provider_name = providers['admin'][feature];
        if (process.env[provider_name] === 'Y' && provider_keys.includes(feature))
            return services[provider_name];
    }

    static getProfile(mode) {
        return modes[mode];
    }

    static getFeatureMode(mode, feature) {
        return modes[mode][feature];
    }

    static getModesForService(name, feature) 
    {
        const providerkey = this.getKeyByFeature(name, feature);
        const partner_keys = [];
        const fModes = Object.entries(modes).filter(([k, v]) => {
            if (v[feature] === providerkey) {
                partner_keys.push(k);
                return true;
            }
            return false;
        });

        return partner_keys;
    }

    static getParentModes(feature, feature_mode)
    {
        const [modes, vals] = Object.entries(modes).flatMap(([k, v]) => {
            
            const match = Object.entries(v).filter(([f, service_key]) => {
                return feature === f
                    && feature_mode === service_key
            });

            return match > 0 ? [k] : [];
        });
    }

    static getSocketClient(key)
    {
        return this.socket_clients?.get(key);
    }

    static checkAccess(eventName, mode) 
    {
        const usertype = this.getProfile(mode);
        if (Object.hasOwn(usertype, 'view') && access['view'].includes(eventName))
            return true;

        if (Object.hasOwn(usertype, 'trade') && access['trade'].includes(eventName))
            return true;

        if (Object.hasOwn(usertype, 'admin') && access['admin'].includes(eventName))
            return true;

        return false;
    }
}