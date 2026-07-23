import scripstore from './scripstore.mjs';
import history_breeze from '../broker/m_breeze_hist.mjs';
import live_breeze from '../broker/m_breeze_live.mjs';
import live_openalgo from '../broker/m_t_openalgo.mjs';
import live_kotak from '../broker/m_t_kotakneo.mjs';
import live_kotak_hsm from '../broker/m_kotak_hsm.mjs';
import trading_socket from './socketclient.mjs';
import paper_trading from './ordersimulator.mjs';

const modes = {
    HISTORY: { view: 'HISTORY', trade: 'SIMULATED', admin: 'SIM_ADMIN' },
    LIVELIVE: { view: 'LIVE', trade: 'LIVE' },
    S1TSADMINS: { view: 'LIVE', trade: 'SIMULATED', admin: 'LIVE_STREAMING' },
    S3T0ADMIN0: { view: 'LIVE_3'},
    LIVELIVEOA: { view: 'LIVE', trade: 'LIVE_2' },
    LIVELIVEIC: { view: 'LIVE_2', trade: 'LIVE_2' },
    S1T1ADMINT: { view: 'LIVE', trade: 'LIVE', admin: 'LIVE_TRADING' },
    S2T1ADMINT: { view: 'LIVE_2', trade: 'LIVE', admin: 'LIVE_TRADING' },
    S1T2ADMINT: { view: 'LIVE', trade: 'LIVE_2', admin: 'LIVE_TRADING' },
    L1L0ADMINS: { view: 'LIVE', admin: 'LIVE_STREAMING' },
    L2L2ADMINS: { view: 'LIVE_2', trade: 'LIVE_2', admin: 'LIVE_STREAMING' },
    ADMINALL: { admin: ['LIVE_STREAMING', 'LIVE_TRADING'] }
};

const services = {
    OPENALGOVIEW: live_openalgo,
    OPENALGOTRADE: live_openalgo,
    KOTAKNEOTRADE: live_kotak,
    KOTAKHSMVIEW: live_kotak_hsm,
    ICICIHISTVIEW: history_breeze,
    ICICILIVEVIEW: live_breeze,
    SOCKETTRADE: trading_socket,
    TPSIMTRADE: paper_trading
};

const providers = {
    view: { HISTORY: 'ICICIHISTVIEW', LIVE: 'OPENALGOVIEW', LIVE_2: 'ICICILIVEVIEW', LIVE_3: 'KOTAKHSMVIEW' },
    trade: { LIVE: 'KOTAKNEOTRADE', LIVE_2: 'OPENALGOTRADE', SIMULATED: 'TPSIMTRADE' },
    admin: { LIVE_TRADING: 'SOCKETTRADE', LIVE_STREAMING: 'OPENALGOVIEW', SIM_ADMIN: 'TPSIMTRADE' }
};

const access = {
    view: ['vix', 'start', 'startv2', 'history', 'speed', 'exit', 'stream', 'option_chain', 'snapshot'],
    trade: ['order', 'cancelorder', 'orderbook'],
    admin: ['live_trading', 'wsOps', 'unsubscribe', 'remove', 'reload']
};

function initialize(mode) {
    const profile = modes[mode];
    if (profile === undefined)
        return { status: 'error', reason: 'profile not available' };

    const list = new Array();
    if (profile['view'] !== undefined)
        list.push(services[providers['view'][profile['view']]]);
    if (profile['trade'] !== undefined)
        list.push(services[providers['trade'][profile['trade']]]);
    if (profile['admin'] !== undefined)
        list.push(services[providers['admin'][profile['admin']]]);
    if (profile['admin'] !== undefined && Array.isArray(profile['admin']))
        profile['admin'].forEach((item) => {
            list.push(services[providers['admin'][profile[item]]]);
        });

    [...new Set(list)].forEach((e) => {
        doInit(e);
    });
}

function doInit(service) {
    try { //init would return undefined or resolved promise for success, reject promise for async errors and exceptions for sync errors
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

function getProviderModeKey(name, mode){
    
    return Object.entries(providers[mode]).find(([k, v]) => {
        return v === name;
    });
}

function initializeAll(skip_list) {
    scripstore.load();
    const list = Object.values(services);
    [...new Set(list)].forEach((s) => {
        if(!skip_list.includes(s.name))
            doInit(s);
    });
}

function getService(type, modename) {
    const modeobject = modes[modename];
    const providerid = modeobject[type];
    const providername = providers[type][providerid];
    return services[providername];
}

function getProfile(mode) {
    return modes[mode];
}

function getFeatureMode(mode, feature){
    return modes[mode][feature];
}

function checkAccess(eventName, mode) {
    const usertype = getProfile(mode);
    if (Object.hasOwn(usertype, 'view') && access['view'].includes(eventName))
        return true;

    if (Object.hasOwn(usertype, 'trade') && access['trade'].includes(eventName))
        return true;

    if (Object.hasOwn(usertype, 'admin') && access['admin'].includes(eventName))
        return true;

    return false;
}

export default { initialize, getService, getProfile, checkAccess, getProviderModeKey, getFeatureMode, initializeAll };