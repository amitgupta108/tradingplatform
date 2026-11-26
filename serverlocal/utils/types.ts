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
    right?: string;
    //key?: 'OPT' | 'FUT' | 'IDX' | 'EQ';
    key?: 'futures' | 'optionchain' | 'strikex' | 'index';
}

export type TScripSet = {
    [k in (typeof STOCKCODES)[number]]: Scrip;
}

export interface QuoteRequest {
    appid: string;
    symbol: string;
}

export type ORDERTYPE = 'LMT' | 'MKT' | 'SL-LMT' | 'SL-MKT';
export type PRODUCT = 'NRML' | 'MIS' | 'CNC';
export type ACTION = 'BUY' | 'SELL';
export type ORDERSTATE = 'OPENED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
export type ORDERMODE = 'LIVE' | 'SIM';
export type SOURCE = 'WEB' | 'API' | 'ALGO';
export type ORDERACTION = 'CREATE' | 'MODIFY' | 'DELETE';
export type VIEWMODE = 'HISTORY' | 'REPLAY' | 'LIVE_5';

export interface Order {
    view_mode: VIEWMODE;
    appid: string;
    orderid: number;
    pricedAt: number;
    lmt_price: number;
    trg_price: number;
    product: PRODUCT;
    action: ACTION;
    filled_q: number;
    quantity: number;
    state: ORDERSTATE;
    ordertype: ORDERTYPE;
    symbol: string;
    stockCode: (typeof STOCKCODES)[number];
    mode: ORDERMODE;
    submit_t: number;
    exec_t: number;
    source: SOURCE;
    strategy: string;
    algocategory: string;
    algoid: string;
}