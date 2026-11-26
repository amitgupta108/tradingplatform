import { SystemService } from '../../../common/service.js';
import { Connector, KotakConnector, ICICIConnector } from './connector.mjs';
import { ConfigService } from '../config/configservice.mjs';
import { webclients, serverclients, modes, access } from '../../utils/constants.js';

export class AuthService extends SystemService {
    constructor(name) {
        super(name);
        this.webclients = webclients;
        this.serverclients = serverclients;
        this.modes = modes;
        this.access = access;
        this.connectors = {
            kotak: new KotakConnector('kotak', true),
            icici: new ICICIConnector('icici', true)
        }
    }

    async init() {
        this.eventservice = ConfigService.getServiceByName('EVENTSERVICE');
        this.eventservice.addListener('ext_auth', ({ provider, authcode }) => {
            this.authenticate(provider, authcode);
        });

        let status = '';
        const connectors = Object.values(this.connectors);
        for (const c of connectors) {
            if (c.load_on_start) {
                const s = await c.loadAuthdata(true);
                status += s + ' ';
            }
        };
        return { status: status };
    }

    async authenticate(provider, authcode) {
        if (['tp-icici-p', 'tp-kotak-p'].includes(authcode))
            return await this.connectors[provider].remoteFetch(provider);
        else
            return await this.connectors[provider].authenticate(authcode);
    }

    async authdata(provider) {
        return await Connector.authkeys(provider, undefined);
    }

    validate(appid, mode) {
        let profile = this.webclients.find((app) => {
            return app.appid === appid
                && app.mode === mode
        });
        if (profile !== undefined) {
            profile.type = 'APP';
            return profile;
        }

        profile = this.serverclients.find((server) => {
            return server.appid === appid
                && server.mode === mode
        });
        if (profile !== undefined) {
            profile.type = 'SERVER';
            return profile;
        }
    }

    getFeatureModeforApp(appid, feature) {
        const mode = this.webclients.find((e) => e.appid === appid)?.mode;
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