export const opt_expiries = {
    NIFTY: {
        first: {date: '16JUN26', startIdx: 2, endIdx: 7},
        second: {date: '23JUN26'},
        third: {date: '30JUN26'}
    },
    CRUDEOIL: {
        first: {date: '16JUN26', startIdx: 2, endIdx: 7},
        second: '18JUL26',
    },
    BANKNIFTY: {
        first: {date: '30JUN26', startIdx: 2, endIdx: 7},
        second: {date: '28JUL26'},
        third: {date: '30JUN26'}
    },
};

export const fut_expiries = {
    NIFTY: {
        first: '30JUN26',
        second: '28JUL26'
    },
    CRUDEOIL: {
        first: '18JUN26',
        second: '18JUL26'
    },
};

export const live_atm = {
    NIFTY: 0,
    CRUDEOIL: 0,
    BANKNIFTY: 0
};

export const strike_size = {
    NIFTY: 50,
    BANKNIFTY: 100,
    CRUDEOIL: 50,
};