window.addEventListener('unhandledrejection', function (event) {
  console.log(event.reason); 
  console.log(event.promise); 
  if (event.reason && event.reason.stack) {
    console.log(event.reason.stack);
  }
});

const instrumentMap = new Map();
const LOT_SIZE = {
  NIFTY: 65,
  CRUDEOIL: 100,
  BANKNIFTY: 25 
};

const EXPIRIES = {
  NIFTY: {
    FIRST: '29SEP26', 
    SECOND: '06OCT26'
  },
  CRUDEOIL: {
    FIRST: '15OCT26'
  }
}

instrumentMap.set('NH2', {
  fExpiry: "25AUG26",
  simStartTime: new Date("2026-07-27 15:25:00").getTime(),
  oExpiries: ["04AUG26", '11AUG26'],
  stockCode: 'NIFTY',
  mode: 'HISTORY',
  appid: 'b6033d82-1d88-470a-bf28-58b217f098e7'
});

instrumentMap.set('NH1', {
  simStartTime: new Date("2026-06-12 09:15:00").getTime(),
  fExpiry: "30JUN26",
  oExpiries: ["17JUN26", "23JUN26"],
  stockCode: 'NIFTY',
  mode: 'HISTORY',
  appid: '5be36ca0-44e8-44d9-b739-4864c6dfc553'
});

instrumentMap.set('NL1', {
  oExpiries: ['FIRST'],
  stockCode: 'NIFTY',
  mode: 'S5T1ABS',
  appid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

instrumentMap.set('NL2', {
  oExpiries: ['FIRST', 'SECOND'],
  stockCode: 'NIFTY',
  mode: 'S2TSA0',
  appid: '996ee155-48d9-49c1-0e18-b17551e8a4gh'
});

instrumentMap.set('NL3', {
  oExpiries: ['FIRST', 'SECOND'],
  stockCode: 'NIFTY',
  mode: 'S2T1AB',
  appid: 'dN2wzV0S-x3Ca-SVQI-AAAH-940b886ee169'
});

instrumentMap.set('NL4', {
  oExpiries: ['FIRST', 'SECOND'],
  stockCode: 'NIFTY',
  mode: 'S1T1ABS',
  appid: '0cd4a0ed-c4a1-4318-940b-b4d3841468d9'
});

instrumentMap.set('ML1',{
  oExpiries: ['FIRST', 'SECOND'],
  stockCode: 'CRUDEOIL',
  mode: 'S6T0A0',
  appid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

instrumentMap.set('ML2',{
  oExpiries: ['FIRST', 'SECOND'],
  stockCode: 'CRUDEOIL',
  mode: 'S1T1ABS',
  appid: '531c0a81-0558-4ad7-8b4c-1ea5bf3775d3'
});

instrumentMap.set('ML3', {
  oExpiries: ['FIRST', 'SECOND'],
  stockCode: 'CRUDEOIL',
  mode: 'S5T1ABS',
  appid: '431c0a81-0558-4ad7-8b4c-1ea5bf3775b4'
});

const urlParams = new URLSearchParams(window.location.search);
const i = urlParams.get('instrument');
const instrument = instrumentMap.get(i);