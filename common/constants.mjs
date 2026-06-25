export const opt_expiries = {
    NIFTY: {
        first: {date: '30JUN26', startIdx: 2, endIdx: 7},
        second: {date: '07JUL26'},
        third: {date: '14JUL26'}
    },
    CRUDEOIL: {
        first: {date: '16JUL26', startIdx: 2, endIdx: 7},
        second: {date: '17AUG26'}

//       first: {date: '16JUL26', startIdx: 2, endIdx: 7},
//       second: {date: '17AUG26'}
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
        first: '18JUL26',
        second: '20AUG26'
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