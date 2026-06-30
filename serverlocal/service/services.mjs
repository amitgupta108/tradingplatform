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

const providers = {
    view: { HISTORY: history_breeze, LIVE: live_openalgo, LIVE_2: live_breeze },
    trade: { LIVE: live_kotak, LIVE_2: live_openalgo, SIMULATED: paper_trading },
    admin: { LIVE_TRADING: trading_socket, LIVE_STREAMING: live_openalgo, SIM_ADMIN: history_breeze }
};

const access = {
    view: ['vix', 'start', 'history', 'speed', 'exit', 'stream', 'option_chain'],
    trade: ['order', 'cancelorder', 'orderbook'],
    admin: ['live_trading', 'wsOps', 'unsubscribe', 'remove', 'reload']
};

function initialize(mode) {
    const profile = modes[mode];
    if (profile === undefined)
        return { status: 'error', reason: 'profile not available' };

    const list = new Array();
    if (profile['view'] !== undefined)
        list.push(providers['view'][profile['view']]);
    if (profile['trade'] !== undefined)
        list.push(providers['trade'][profile['trade']])
    if (profile['admin'] !== undefined)
        list.push(providers['admin'][profile['admin']])
    if (profile['admin'] !== undefined && Array.isArray(profile['admin']))
        profile['admin'].forEach((item) => {
            list.push(providers['admin'][profile[item]]);
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

function getProviderProfile(name){

}

function getService(type, mode) {
    const services = modes[mode];
    return providers[type][services[type]];
}

function getProfile(mode) {
    return modes[mode];
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

export default { initialize, getService, getProfile, checkAccess };