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

instrumentMap.set('NH2', {
  fExpiry: "25AUG26",
  simStartTime: new Date("2026-07-27 15:25:00").getTime(),
  oExpiries: ["04AUG26", '11AUG26'],
  stockCode: 'NIFTY',
  exchange: 'NFO',
  mode: 'HISTORY',
  appid: 'b6033d82-1d88-470a-bf28-58b217f098e7'
});

instrumentMap.set('NH1', {
  simStartTime: new Date("2026-06-12 09:15:00").getTime(),
  fExpiry: "30JUN26",
  oExpiries: ["17JUN26", "23JUN26"],
  stockCode: 'NIFTY',
  exchange: 'NFO',
  mode: 'HISTORY',
  appid: '5be36ca0-44e8-44d9-b739-4864c6dfc553'
});

instrumentMap.set('BL1', {
  fExpiry: "25AUG26",
  oExpiries: ["25AUG26", "30SEP26"],
  stockCode: 'BANKNIFTY',
  exchange: 'NFO',
  mode: 'LIVESIM',
  appid: '0cd4a0ed-c4a1-4318-940b-b4d3841468d9'
});

instrumentMap.set('NL1', {
  fExpiry: "25AUG26",
  oExpiries: ["04AUG26", "11AUG26"],
  stockCode: 'NIFTY',
  exchange: 'NFO',
  mode: 'S3T0ADMINT',
  appid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

instrumentMap.set('NL2', {
  fExpiry: "25AUG26",
  oExpiries: ["04AUG26", "11AUG26"],
  stockCode: 'NIFTY',
  exchange: 'NFO',
  mode: 'S2T0ADMINS',
  appid: '996ee155-48d9-49c1-0e18-b17551e8a4gh'
});

instrumentMap.set('NL3', {
  fExpiry: "25AUG26",
  oExpiries: ["04AUG26", "11AUG26"],
  stockCode: 'NIFTY',
  exchange: 'NFO',
  mode: 'S1T1ADMINT',
  appid: 'dN2wzV0S-x3Ca-SVQI-AAAH-940b886ee169'
});

instrumentMap.set('NL4', {
  fExpiry: "25AUG26",
  oExpiries: ["11AUG26", "18AUG26"],
  stockCode: 'NIFTY',
  exchange: 'NFO',
  mode: 'S3T1ADMINT',
  appid: '0cd4a0ed-c4a1-4318-940b-b4d3841468d9'
});

instrumentMap.set('ML1',{
  fExpiry: "19AUG26",
  oExpiries: ["17AUG26", "17SEP26"],
  stockCode: 'CRUDEOIL',
  exchange: 'MCX',
  mode: 'S2T0ADMINS',
  appid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

instrumentMap.set('ML2',{
  fExpiry: "19AUG26",
  oExpiries: ["17AUG26", "17SEP26"],
  stockCode: 'CRUDEOIL',
  exchange: 'MCX',
  mode: 'S3T1ADMINT',
  appid: '531c0a81-0558-4ad7-8b4c-1ea5bf3775d3'
});

instrumentMap.set('ML3', {
  fExpiry: "19AUG26",
  oExpiries: ["17AUG26"],
  stockCode: 'CRUDEOIL',
  exchange: 'MCX',
  mode: 'S1T1ADMINT',
  appid: '431c0a81-0558-4ad7-8b4c-1ea5bf3775b4'
});

const urlParams = new URLSearchParams(window.location.search);
const i = urlParams.get('instrument');
const instrument = instrumentMap.get(i);