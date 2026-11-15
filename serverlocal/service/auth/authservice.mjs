import { SystemService } from '../system/service.js';
import { Connector, KotakConnector, ICICIConnector } from './connector.mjs';
import { ConfigService } from '../config/configservice.mjs';
import { appclients, serverclients, modes, access } from '../../utils/constants.js';

export class AuthService extends SystemService {
    constructor(name) {
        super(name);
        this.appclients = appclients;
        this.modes = modes;
        this.access = access;
        this.connectors = {
            kotak: new KotakConnector('kotak', false),
            icici: new ICICIConnector('icici', false)
        }
    }

    async init() {
        const values = Array.from(Object.values(this.connectors));
        let status = '';
        for (const v of values) {
            if (v.load_on_start)
                status = status + (await v.loadAuthdata()) + ' ';
        }
        return { status: status };
    }

    authenticate(authcode) {
        let provider;
        if (authcode.length === 6 || authcode === 'tp-kotak-p')
            provider = 'kotak';
        else if (authcode.length === 8 || authcode === 'tp-icici-p')
            provider = 'icici';

        return this.connectors[provider].authenticate(authcode);
    }

    async authdata(provider) {
        return await Connector.authkeys(provider, undefined);
    }

    validate(appid, mode) {
        let profile = this.appclients.find((app) => {
            return app.appid === appid
                && app.mode === mode
        });
        if (profile !== undefined) {
            profile.type = 'APP';
            return profile;
        }

        profile = this.serverclients.find((server) => {
            return server.serverid === appid
                && server.mode === mode
        });
        if (profile !== undefined) {
            profile.type = 'SERVER';
            return profile;
        }
    }

    getFeatureModeforApp(appid, feature) {
        const mode = this.appclients.find((e) => e.appid === appid)?.mode;
        return this.modes[mode][feature];
    }

    checkAccess(eventName, mode) {
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