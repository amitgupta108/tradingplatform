import { SystemService } from './service.mjs';

class EventService extends SystemService
{
    constructor() {
        super('EVENTSERVICE');
    }
}

export const eventservice = new EventService();