import { STOCKCODES } from "./constants.js";

export interface AuthHeaders {
    'Authorization'?: string;
    'Content-Type'?: string;
    'Accept'?: string;
    'Sid'?: string;
    'Auth'?: string;
    'neo-fin-key'?: string;
}

export interface AuthData {
    provider: string;
    date: string;
    feedUrl?: string;
    baseUrl?: string;
    sid?: string;
    token?: string;
}

export interface Endpoints {
    order?: string;
    modify?: string;
    cancel?: string;
    orderbook?: string;
    positions?: string;
    history?: string;
    expiries?: URL;
}


export interface IExpiries {
    options: string[];
    futures: string[];
}

export type TExpiriesSet = {
    [k in (typeof STOCKCODES)[number]]: IExpiries;
}
