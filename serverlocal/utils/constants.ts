import scrips_config from '../data/scrips_config.json' with { type: 'json' };
import services_config from '../data/services_config.json' with { type: 'json' };
import apps_config from '../../../../secure/app_config.json' with { type: 'json' };

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