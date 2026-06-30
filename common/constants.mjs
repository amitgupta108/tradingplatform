export const OPT_EXPIRIES = {
    NIFTY: {
        FIRST: {date: '07JUL26', startIdx: 2, endIdx: 7, toStream: true},
        SECOND: { date: '14JUL26', startIdx: 2, endIdx: 7, toStream: false},
        THIRD: {date: '14JUL26', toStream: false}
    },
    CRUDEOIL: {
        FIRST: {date: '16JUL26', startIdx: 2, endIdx: 7},
        SECOND: {date: '17AUG26'}
    },
    BANKNIFTY: {
        FIRST: {date: '28JUL26', startIdx: 2, endIdx: 7},
        SECOND: {date: '28JUL26'},
        THIRD: {date: '30JUN26'}
    },
};

export const FUT_EXPIRIES = {
    NIFTY: {
        FIRST: '28JUL26',
        SECOND: '28JUL26'
    },
    CRUDEOIL: {
        FIRST: '18JUL26',
        SECOND: '20AUG26'
    },
};

export const STRIKE_SIZE = {
    NIFTY: 50,
    BANKNIFTY: 100,
    CRUDEOIL: 50,
};