import scrips_config from '../data/scrips_config.json' with { type: 'json' };
import services_config from '../data/services_config.json' with { type: 'json' };
import apps_config from '../../../../secure/app_config.json' with { type: 'json' };
import type { Scrip } from './types.js';

export const STOCKCODES = ['NIFTY', 'CRUDEOIL'];

export const {
    OPT_CONFIG,
    EXCHANGES,
    STRIKE_SIZE,
    LOTSIZE,
    filePaths,
    filters,
    tp_filters
} = scrips_config;

export const {
    services,
} = services_config;

export const {
    webclients,
    serverclients,
    modes,
    access,
    providers
} = apps_config;

export const toScrip = (symbol: string): Scrip => {
    const s = { symbol: symbol } as Scrip;
    const regex = /[0-9]/;
    const idx = symbol.search(regex);

    s.stockCode = idx === -1 ? symbol : symbol.slice(0, idx);
    s.exchange = ['NIFTY', 'INDVIX'].includes(symbol) ? 'nse_cm' : EXCHANGES[s.stockCode].toLowerCase();
    s.key = symbol.endsWith('FUT') ? 'FUT' : symbol.endsWith('PE') || symbol.endsWith('CE') ? 'OPT' : 'IDX';
    if (idx !== -1) {
        s.expiry = symbol.slice(idx, idx + 7);
        if (s.key === 'OPT') {
            s.strike = symbol.slice(idx + 7, -2);
            s.call = symbol.slice(-2) === 'CE';
        }
    }
    return s;
}