import scrips_config from '../data/scrips_config.json' with { type: 'json' };
import services_config from '../data/services_config.json' with { type: 'json' };
import apps_config from '../config/app_config.json' with {type: 'json'};

export const {
    OPT_EXPIRIES,
    FUT_EXPIRIES,
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
    appids,
    modes,
    access,
    providers
} = apps_config;