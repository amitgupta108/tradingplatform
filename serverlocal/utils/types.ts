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
    'FUTURES': string[];
    'OPTIONS': string[];
}

export type TExpiriesSet = {
    [k in (typeof STOCKCODES)[number]]: IExpiries;
}

export interface Quote {
    symbol: string;
    ltp: number;
    ltt: number;
}

export interface Scrip {
    symbol: string;
    exchange: string;
    stockCode: string;
    expiry?: string;
    strike?: string;
    call: boolean;
    key?: 'OPT' | 'FUT' | 'IDX' | 'EQ';
}

export type TScripSet = {
    [k in (typeof STOCKCODES)[number]]: Scrip;
}

export interface QuoteRequest {
    appid: string;
    symbol: string;
}