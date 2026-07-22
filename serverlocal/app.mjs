import Session from './session/session.mjs';
import services from './service/services.mjs';
import apiserver from './apiserver.mjs'; 
import { socketmap } from './session/appstate.mjs';

function startServices(skip_list) 
{
    const list = services.initializeAll([]);
}

function connect(s)
{        
    const appid = s.handshake.auth.token;
    const stockCode = s.handshake.auth.stockCode;
    const mode = s.handshake.auth.mode;
    
    const profile = services.getProfile(mode);
    if(profile === undefined) {
        console.log('profile not found');
        return;
    }
    
    //services.initialize(mode);
    session(s, appid, stockCode, mode);
    registerHandlers(s, appid, mode);

    s.on("error", (err) => {
        console.error(`[Global Error]  Socket ${s.id}:`, err.message);
    });
}

function session(s, appid, stockCode, mode)
{
    const view_mode = services.getProfile(mode)['view']; 
    const i_appid = view_mode === 'HISTORY' ? appid : stockCode + view_mode;
    let sn = Session.sn(i_appid);

    if(sn === undefined)
        sn = new Session(i_appid, mode, stockCode);

    sn.shared_with.set(appid, { m_subs: sn.status});
    socketmap.set(appid, {socket: s, mode: mode, stockCode: stockCode});        
    s.sn = sn;
}

function registerHandlers(s, appid, mode)
{
    const profile = services.getProfile(mode);

    if (Object.hasOwn(profile, 'view'));
        apiserver.registerDataRequests(s, appid, mode);
    
    if (Object.hasOwn(profile, 'trade'));
        apiserver.registerTradeRequests(s, appid, mode);
    
    if (Object.hasOwn(profile, 'admin'))
        apiserver.registerAdminRequests(s, appid, mode);

    apiserver.registerDisconnectionHandler(s, appid, mode);
    registerAuthorizer(s, mode);
}

function registerAuthorizer(s, mode)
{
    s.use(([eventName, ...args], next) => {
        const implementedEvents = s.eventNames(); 
        
        if (!implementedEvents.includes(eventName))
            return next(new Error(`Unsupported event: ${eventName}`));

        if (!services.checkAccess(eventName, mode))
            return next(new Error("Unauthorized access to admin resource"));

        next();
    });
}

export default {connect, startServices}