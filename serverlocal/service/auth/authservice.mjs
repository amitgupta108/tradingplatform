import { SystemService } from '../system/service.mjs';
import { Connector, KotakConnector, ICICIConnector, TPAppConnector } from './connector.mjs';
import { eventservice } from '../system/eventservice.mjs';
import { ConfigService, modes } from '../.config/configservice.mjs';
import apps from '../../config/app_config.json' with {type: 'json'};

const access = {
    view: ['vix', 'startv2', 'history', 'speed', 'exit', 'stream', 'option_chain'],
    trade: ['order', 'cancelorder', 'orderbook', 'positions', 'updateorder'],
    admin: [ 'authenticate', 'scrips', 'subscribe', 'unsubscribe']
};

export class AuthService extends SystemService
{
    constructor(name)
    {
        super(name);
        this.connectors = {
            kotak: new KotakConnector('kotak', true, true),
            icici: new ICICIConnector('icici', true, true),
            tpapp: new TPAppConnector('tpapp', true, false)
        }
    }

    async init()
    {
        this.appids = apps.appids;
        eventservice.addListener('ext_auth', (msg) => {
            this.generateSession(msg);
        });

        const values = Array.from(Object.values(this.connectors));
        let status = '';
        for(const v of values){
            if(v.load_on_start)
                status = status + (await v.loadAuthdata()) + ' ';
        }
        return { status: status};
    }

    authenticate(id_text) 
    {
        let params = {}; let provider;
        if (id_text.length === 6) {
            params = { arg1: id_text }
            provider = 'kotak';
        } 
        else if (id_text === 'icici') {
            provider = 'icici';
        }
        else if (id_text === 'tp-icici-p')
        {
            params = { arg1: 'icici', arg2: 'authcode' };
            provider = 'tpapp';
        }
        else if (id_text === 'tp-kotak-p') {
            params = { arg1: 'kotak', arg2: 'authcode' };
            provider = 'tpapp';
        }
        else 
            return;

        return this.connectors[provider].authenticate(params);
    }

    generateSession(authdata) 
    {
        this.connectors[authdata.provider].generateSession(authdata);
    }

    async value(provider, key)
    {
        const wrapper = {};
        wrapper[key] = undefined;
        return await Connector.authkeys(provider, wrapper);
    }

    validate(appid, mode)
    {
        return this.appids.filter((app) => { 
            return app.appid === appid
                && app.mode === mode
        });
    }

    getFeatureModeforApp(appid, feature)
    {
        const mode = this.appids.find((e) => e.appid === appid)?.mode;
        return modes[mode][feature];
    }

    checkAccess(eventName, mode) 
    {
        const usertype = ConfigService.getProfile(mode);
        if (Object.hasOwn(usertype, 'view') && access['view'].includes(eventName))
            return true;

        if (Object.hasOwn(usertype, 'trade') && access['trade'].includes(eventName))
            return true;

        if (Object.hasOwn(usertype, 'admin') && access['admin'].includes(eventName))
            return true;

        return false;
    }

}