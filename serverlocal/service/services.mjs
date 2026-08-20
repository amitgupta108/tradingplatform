import paper_trading from './ordersimulator.mjs';
import {scripstore} from './scripstore.mjs';
import { eventservice } from './eventservice.mjs';
import { authservice } from './auth/authservice.mjs';

import history_breeze from '../broker/m_breeze_hist.mjs';
import live_breeze from '../broker/m_breeze_live.mjs';
import live_openalgo from '../broker/m_t_openalgo.mjs';
import live_kotak from '../broker/m_t_kotakneo.mjs';
import live_kotak_hsm from '../broker/m_kotak_hsm.mjs';

const modes = {
    HISTORY: { view: 'HISTORY', trade: 'SIMULATED'},
    LIVELIVE: { view: 'LIVE', trade: 'LIVE' },
    S1TSADMINS: { view: 'LIVE', trade: 'SIMULATED', admin: 'LIVE_STREAMING' },
    S2T0ADMINS: { view: 'LIVE_2', admin: 'BROKER_AUTH' },
    S3T1ADMINT: { view: 'LIVE_3', trade: 'LIVE', admin: 'BROKER_AUTH'},
    S4T0ADMINS: { view: 'LIVE_4', admin: 'LIVE_STREAMING_2' },
    LIVELIVEOA: { view: 'LIVE', trade: 'LIVE_2' },
    S1T1ADMINT: { view: 'LIVE', trade: 'LIVE', admin: 'LIVE_TRADING' },
    L1L0ADMINS: { view: 'LIVE', admin: 'LIVE_STREAMING_1' },
    ADMINALL: { admin: ['LIVE_STREAMING', 'LIVE_TRADING'] }
};

const services = {
    OPENALGOVIEW: live_openalgo,
    OPENALGOTRADE: live_openalgo,
    KOTAKNEOTRADE: live_kotak,
    KOTAKHSMVIEW: live_kotak_hsm,
    ICICIHISTVIEW: history_breeze,
    ICICILIVEVIEW: live_breeze,
    TPSIMTRADE: paper_trading,
    SCRIPSTORE: scripstore,
    EVENTSERVICE: eventservice,
    AUTHSERVICE: authservice
};

const providers = {
    view: { HISTORY: 'ICICIHISTVIEW', LIVE: 'OPENALGOVIEW', LIVE_2: 'ICICILIVEVIEW', LIVE_3: 'KOTAKHSMVIEW', LIVE_4: 'FYERSVIEW'},
    trade: { LIVE: 'KOTAKNEOTRADE', LIVE_2: 'OPENALGOTRADE', SIMULATED: 'TPSIMTRADE' },
    admin: { LIVE_STREAMING_1: 'OPENALGOVIEW', BROKER_AUTH: 'AUTHSERVICE'}
};

const access = {
    view: ['vix', 'startv2', 'history', 'speed', 'exit', 'stream', 'option_chain', 'snapshot'],
    trade: ['order', 'cancelorder', 'orderbook', 'positions', 'wsOps'],
    admin: [ 'unsubscribe', 'remove', 'reload', 'authenticate']
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

function initializeAll() {
    const list = Object.entries(services);
        
    const active = list.filter(([k, v]) => {
        return process.env[k] === 'Y';
    });

    const val = active.map(([k, v]) => v);
    
    [...new Set(val)].forEach((v) => {
            doInit(v);
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

function getModesForService(name, feature){
    const serviceid = Object.entries(providers[feature]).filter(([k , v]) => {
        return v === name;
    });
     
    const fModes = Object.entries(modes).filter(([k , v]) => {
        return Object.values(v) === serviceid[0];
    });
    const [keys, values] = fModes;
    return keys;
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

/**
 * Fetches the precise atomic timestamp from your background API server
 * and corrects for local network transit latency.
 * @returns {Promise<number>} Precise Unix millisecond timestamp
 */
async function getSyncedTime() {
    // 1. Record the exact local clock tick right before sending the query
    const clientStartTime = Date.now();

    try {
        // 2. Fetch from your local API, bypassing all caches
        const response = await fetch('http://localhost:5001/api/exact-time', {
            method: 'GET',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        // 3. Record the local clock tick the exact moment the payload lands
        const clientEndTime = Date.now();

        // 4. Calculate local round-trip transit time (RTT)
        const roundTripTime = clientEndTime - clientStartTime;

        // 5. Calculate one-way transit delay (RTT / 2)
        const localTransitLatency = roundTripTime / 2;

        // 6. Apply latency correction to the server's atomic timestamp
        const flawlessTimestampMs = Math.round(data.independent_timestamp_ms + localTransitLatency);

        // Optional Diagnostics: Log the sync metrics to your terminal console
        console.log(`[Time API Sync] Success | Transit Latency: +${localTransitLatency}ms | RTT: ${roundTripTime}ms`);
        console.log(`[Time API Sync] True ISO String: ${new Date(flawlessTimestampMs).toISOString()}`);

        return flawlessTimestampMs;

    } catch (error) {
        console.error("[Time API Error] Failed to fetch time, falling back to local OS clock:", error.message);
        // Fallback safety layer: returns the standard OS clock if the background service goes down
        return Date.now();
    }
}

export default { initialize, getService, getProfile, checkAccess, getProviderModeKey, getFeatureMode, initializeAll, getModesForService, getSyncedTime };