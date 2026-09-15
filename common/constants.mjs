export const OPT_EXPIRIES = {
    NIFTY: {
        FIRST: '22SEP26',
        SECOND: '29SEP26',
    },
    CRUDEOIL: {
        FIRST: '17SEP26',
        SECOND: '15OCT26'
    },
    BANKNIFTY: {
        FIRST: '29SEP26',
    },
};

export const FUT_EXPIRIES = {
    NIFTY: {
        FIRST: '29SEP26',
    },
    CRUDEOIL: {
        FIRST: '21SEP26',
    },
};

export const OPT_CONFIG = {
    FIVE: { startIdx: 0, endIdx: 5, toStream: true },
    SIX: { startIdx: 0, endIdx: 6, toStream: true },
};

export const EXCHANGES = {
    NIFTY: 'nse_fo',
    CRUDEOIL: 'mcx_fo'
};

export const STRIKE_SIZE = {
    NIFTY: 50,
    BANKNIFTY: 100,
    CRUDEOIL: 50,
};