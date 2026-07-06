import history_breeze from '../broker/m_breeze_hist.mjs';
import live_breeze from '../broker/m_breeze_live.mjs';
import live_openalgo from '../broker/m_t_openalgo.mjs';
import live_kotak from '../broker/m_t_kotakneo.mjs';
import trading_socket from './socketclient.mjs';
import paper_trading from './ordersimulator.mjs';

const modes = {
    HISTORY: { view: 'HISTORY', trade: 'SIMULATED', admin: 'SIM_ADMIN' },
    LIVELIVE: { view: 'LIVE', trade: 'LIVE' },
    S1TSADMINS: { view: 'LIVE', trade: 'SIMULATED', admin: 'LIVE_STREAMING' },
    LIVELIVEOA: { view: 'LIVE', trade: 'LIVE_2' },
    LIVELIVEIC: { view: 'LIVE_2', trade: 'LIVE_2' },
    S1T1ADMINT: { view: 'LIVE', trade: 'LIVE', admin: 'LIVE_TRADING' },
    L1L2ADMINT: { view: 'LIVE', trade: 'LIVE_2', admin: 'LIVE_TRADING' },
    L1L0ADMINS: { view: 'LIVE', admin: 'LIVE_STREAMING' },
    L2L2ADMINS: { view: 'LIVE_2', trade: 'LIVE_2', admin: 'LIVE_STREAMING' },
    ADMINALL: { admin: ['LIVE_STREAMING', 'LIVE_TRADING'] }
};

const services = {
    OPENALGOVIEW: live_openalgo,
    OPENALGOTRADE: live_openalgo,
    KOTAKNEOTRADE: live_kotak,
    ICICIHISTORY: history_breeze,
    ICICILIVEVIEW: live_breeze,
    SOCKETTRADE: trading_socket,
    TPSIMTRADE: paper_trading
};

const providers = {
    view: { HISTORY: 'ICICIHISTORY', LIVE: 'OPENALGOVIEW', LIVE_2: 'ICICILIVEVIEW' },
    trade: { LIVE: 'KOTAKNEOTRADE', LIVE_2: 'OPENALGOTRADE', SIMULATED: 'TPSIMTRADE' },
    admin: { LIVE_TRADING: 'SOCKETTRADE', LIVE_STREAMING: 'OPENALGOVIEW', SIM_ADMIN: 'ICICIHISTORY' }
};

const access = {
    view: ['vix', 'start', 'startv2', 'history', 'speed', 'exit', 'stream', 'option_chain'],
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
        const p = doInit(e);

        if(p !== undefined) 
            if(p instanceof Promise)
                p.then((response) => console.log('init message ' + e.name + ' ' + response?.status))
                    .catch((error) => console.error('init async error ' + e.name + ' ' + error?.reason));
            else
                console.log(e.name + ' ' + p?.status);
    });
}

function doInit(service)
{    
    try { //init would return undefined or resolved promise for success, reject promise for async errors and exceptions for sync errors
        return service.init();  
    } catch (exception) {
        console.error('init sync error ' + service.name + ' ' + exception);
    }
}

function getProviderModeKey(name, mode){
    
    return Object.entries(providers[mode]).find(([k, v]) => {
        return v === name;
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

export default { initialize, getService, getProfile, checkAccess, getProviderModeKey, getFeatureMode };