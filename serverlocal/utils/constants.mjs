import scrips_config from '../config/scrips_config.json' with { type: 'json' };
import services_config from '../config/services_config.json' with { type: 'json' };

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
    services
} = services_config;