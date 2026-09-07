import { scripstore } from '../scripstore.mjs';
import { eventservice } from '../eventservice.mjs';
import { authservice } from '../auth/authservice.mjs';
import { ordersimulator } from '../ordersimulator.mjs';
import { m_icici_live } from '../../broker/m_breeze_live.mjs';
import { m_icici_hist } from '../../broker/m_breeze_hist.mjs';
import { m_openalgo_live } from '../../broker/m_openalgo.mjs';
import { m_kotak_live } from '../../broker/m_kotak_live.mjs';
import live_openalgo from '../../broker/m_t_openalgo.mjs';
import live_kotak from '../../broker/m_t_kotakneo.mjs';

const modes = {
    HISTORY: { view: 'HISTORY', trade: 'SIMULATED', admin: 'BROKER_AUTH' },
    S1TSAB: { view: 'LIVE_1', trade: 'SIMULATED', admin: 'BROKER_AUTH' },
    S1T1AB: { view: 'LIVE_1', trade: 'LIVE_1', admin: 'BROKER_AUTH'},
    S2T1AB: { view: 'LIVE_2', trade: 'LIVE_1', admin: 'BROKER_AUTH' },
    S2T0A0: { view: 'LIVE_2'},
    S2T2A0: { view: 'LIVE_2', trade: 'LIVE_2'},
    S3T1AB: { view: 'LIVE_3', trade: 'LIVE_1', admin: 'BROKER_AUTH'},
    S3T0A0: { view: 'LIVE_3'},
};

const services = {
    OPENALGOVIEW: m_openalgo_live,
    OPENALGOTRADE: live_openalgo,
    KOTAKNEOTRADE: live_kotak,
    KOTAKLIVEVIEW: m_kotak_live,
    ICICIHISTVIEW: m_icici_hist,
    ICICILIVEVIEW: m_icici_live,
    ORDERSIMULATOR: ordersimulator,
    SCRIPSTORE: scripstore,
    EVENTSERVICE: eventservice,
    AUTHSERVICE: authservice,
};

const providers = {
    view: { LIVE_1: 'KOTAKLIVEVIEW', LIVE_2: 'OPENALGOVIEW', LIVE_3: 'ICICILIVEVIEW', HISTORY: 'ICICIHISTVIEW'},
    trade: { LIVE_1: 'KOTAKNEOTRADE', LIVE_2: 'OPENALGOTRADE', SIMULATED: 'ORDERSIMULATOR' },
    admin: { BROKER_AUTH: 'AUTHSERVICE', SCRIPT_STORE: 'SCRIPSTORE'}
};

const access = {
    view: ['vix', 'startv2', 'history', 'speed', 'exit', 'stream', 'option_chain'],
    trade: ['order', 'cancelorder', 'orderbook', 'positions', 'wsOps'],
    admin: [ 'unsubscribe', 'remove', 'reload', 'authenticate']
};

export class ConfigService
{
    static initializeAll() 
    {
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

    static getProviderModeKey(name, mode) 
    {
        return Object.entries(providers[mode]).find(([k, v]) => {
            return v === name;
        });
    }

    static getService(type, modename) 
    {
        const modeobject = modes[modename];
        const providerid = modeobject[type];
        const providername = providers[type][providerid];
        return services[providername];
    }

    static getProfile(mode) {
        return modes[mode];
    }

    static getFeatureMode(mode, feature) {
        return modes[mode][feature];
    }

    static getModesForService(name, feature) 
    {
        const serviceid = Object.values(providers[feature]).find((v) => {
            return v === name;
        });

        const fModes = Object.values(modes).filter((v) => {
            return v[feature] === serviceid;
        });

        return fModes;
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