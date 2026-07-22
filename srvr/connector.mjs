/*
import { breeze } from './appstate.mjs';
import {wsemit} from './qserver.mjs';

export function connect() {
    breeze.generateSession(process.env.breeze_secret, process.env.breeze_sid)
    .then((resp) => {
        breeze.wsConnect();
        breeze.onTicks = wsemit;
        console.error('breeze session started ');
    }).catch((error) => {
        console.error('breeze start session ' + error);
    });
}
*/