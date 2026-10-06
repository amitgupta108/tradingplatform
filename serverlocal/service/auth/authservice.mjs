import { SystemService } from '../system/service.mjs';
import { Connector, KotakConnector, ICICIConnector, TPAppConnector } from './connector.mjs';
import { ConfigService } from '../.config/configservice.mjs';
import { appids, modes, access } from '../../utils/constants.mjs';

export class AuthService extends SystemService
{
    constructor(name)
    {
        super(name);
        this.appids = appids;
        this.modes = modes;
        this.access = access;
        this.connectors = {
            kotak: new KotakConnector('kotak', true, true),
            icici: new ICICIConnector('icici', true, true),
            tpapp: new TPAppConnector('tpapp', true, false)
        }
    }

    async init()
    {
        this.eventservice = ConfigService.getServiceByName('EVENTSERVICE');
        this.eventservice.addListener('ext_auth', (msg) => {
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

    async authenticate(id_text) 
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
            params = { arg1: 'icici' };
            provider = 'tpapp';
        }
        else if (id_text === 'tp-kotak-p') {
            params = { arg1: 'kotak' };
            provider = 'tpapp';
        }
        else 
            return;

        const authdata = await this.connectors[provider].authenticate(params);
        if(provider === 'tpapp')
            this.connectors[params['arg1']].saveAndNotify(authdata);
    }

    generateSession(authdata) 
    {
        this.connectors[authdata.provider].generateSession(authdata);
    }

    async authdata(provider)
    {
        return await Connector.authkeys(provider, undefined);
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
        return this.modes[mode][feature];
    }

    checkAccess(eventName, mode) 
    {
        const usertype = ConfigService.getProfile(mode);
        if (Object.hasOwn(usertype, 'view') && this.access['view'].includes(eventName))
            return true;

        if (Object.hasOwn(usertype, 'trade') && this.access['trade'].includes(eventName))
            return true;

        if (Object.hasOwn(usertype, 'admin') && this.access['admin'].includes(eventName))
            return true;

        return false;
    }

}