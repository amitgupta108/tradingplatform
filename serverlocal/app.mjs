import { ConfigService as services } from './service/.config/configservice.mjs';
import apiserver from './apiserver.mjs'; 

export class AppClientManager
{
    startServices() 
    {
        services.initializeAll();
    }

    connect(s)
    {        
        const appid = s.handshake.auth.token;
        const mode = s.handshake.auth.mode;
        
        const profile = services.getProfile(mode);
        if(profile === undefined) {
            console.log('profile not found');
            return;
        }
        
        services.addToUserMap(appid, { socket: s, mode: mode});
        this.registerHandlers(s, appid, mode);

        s.on("error", (err) => {
            console.error(`[Global Error]  Socket ${s.id}:`, err.message);
        });
    }


    registerHandlers(s, appid, mode)
    {
        const profile = services.getProfile(mode);

        if (Object.hasOwn(profile, 'view'));
            apiserver.registerDataRequests(s, appid, mode);
        
        if (Object.hasOwn(profile, 'trade'));
            apiserver.registerTradeRequests(s, appid, mode);
        
        if (Object.hasOwn(profile, 'admin'))
            apiserver.registerAdminRequests(s, appid, mode);

        apiserver.registerDisconnectionHandler(s, appid, mode);
        this.registerAuthorizer(s, mode);
    }

    registerAuthorizer(s, mode)
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
}

import { eventservice } from './service/eventservice.mjs';
export class ServerClientManager
{
    constructor() 
    {
        this.socketmap = new Map();
    }

    startServices()
    {
        eventservice.addListener('quote', (appid, q) => {
            this.sendQuote(appid, q);
        });
    }
     
    connect(s)
    {
        console.log('Client connected');
        const appid = crypto.randomUUID();
        this.socketmap.set(appid, s);

        s.send(JSON.stringify({ type: 'handshake', key: appid }));

        s.on('message', (input, isBinary) => {
            const payload = isBinary ? input : input.toString();
            console.log('Received from client: ' + payload);

            const message = JSON.parse(payload);

            if (message.appid !== undefined)
                eventservice.emit('SERVERAPP', message.event, message.appid, message.data);
            else
                s.close();
        });

        s.on('close', () => {
            console.log('Client disconnected');
        });

        s.on('error', (error) => {
            console.error('Socket error:', error);
        });
    }

    sendQuote(appid, q) 
    {
        const s = this.socketmap.get(appid);
        s?.send(JSON.stringify({ type: 'quote', data: q }));
    }
}