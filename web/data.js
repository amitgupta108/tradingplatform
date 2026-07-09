window.addEventListener('unhandledrejection', function (event) {
  console.log(event.reason); 
  console.log(event.promise); 
  if (event.reason && event.reason.stack) {
    console.log(event.reason.stack);
  }
});

const lscount = 8;
const instrumentMap = new Map();

instrumentMap.set('NH2', {
  fExpiry: "26MAY26",
  simStartTime: new Date("2026-05-15 09:15:00").getTime(),
  oExpiries: ["19MAY26", "26MAY26"],
  stockCode: 'NIFTY',
  exchange: 'NFO',
  lscount: lscount,
  mode: 'HISTORY',
  lotsize: 65,
  appid: 'b6033d82-1d88-470a-bf28-58b217f098e7'
});

instrumentMap.set('NH1', {
  simStartTime: new Date("2026-06-12 09:15:00").getTime(),
  fExpiry: "30JUN26",
  oExpiries: ["17JUN26", "23JUN26"],
  stockCode: 'NIFTY',
  exchange: 'NFO',
  lscount: lscount,
  mode: 'HISTORY',
  lotsize: 65,
  appid: '5be36ca0-44e8-44d9-b739-4864c6dfc553'
});

instrumentMap.set('BL1', {
  simStartTime: new Date("2026-06-09 09:15:00").getTime(),
  fExpiry: "30JUN26",
  oExpiry: "30JUN26",
  oExpiryNxt: "28JUL26",
  stockCode: 'BANKNIFTY',
  exchange: 'NFO',
  lscount: lscount,
  mode: 'LIVESIM',
  lotsize: 30,
  appid: '0cd4a0ed-c4a1-4318-940b-b4d3841468d9'
});

instrumentMap.set('NL1', {
  simStartTime: Date.now(),
  stockCode: 'NIFTY',
  exchange: 'NFO',
  lscount: lscount,
  mode: 'S1T1ADMINT',
  lotsize: 65,
  appid: '0cd4a0ed-c4a1-4318-940b-b4d3841468d9'
});

instrumentMap.set('NL2', {
  simStartTime: Date.now(),
  fExpiry: "28JUL26",
  oExpiries: ["21JUL26", "28JUL26"],
  stockCode: 'NIFTY',
  exchange: 'NFO',
  lscount: lscount,
  mode: 'S1TSADMINS',
  lotsize: 65,
  appid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

instrumentMap.set('NP1', {
  simStartTime: Date.now(),
  fExpiry: "30JUN26",
  oExpiry: "02JUN26",
  oExpiryNxt: "09JUN26",
  stockCode: 'NIFTY',
  exchange: 'NFO',
  lscount: lscount,
  mode: 'LIVESIM',
  lotsize: 65,
  appid: crypto.randomUUID
});

instrumentMap.set('MP1',{
  simStartTime: Date.now(),
  fExpiry: "18JUN26",
  oExpiry: "16JUN26",
  oExpiryNxt: "16JUN26",
  stockCode: 'CRUDEOIL',
  exchange: 'MCX',
  lscount: lscount,
  mode: 'LIVESIM',
  lotsize: 100,
  appid: 'sM2wzV0S-x3Ca-SVQI-AAAH-940b886ee155'
});

instrumentMap.set('ML1',{
  simStartTime: Date.now(),
  fExpiry: "20JUL26",
  oExpiry: "16JUL26",
  oExpiryNxt: "17AUG26",
  stockCode: 'CRUDEOIL',
  exchange: 'MCX',
  lscount: lscount,
  mode: 'S1T1ADMINT',
  lotsize: 100,
  appid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

instrumentMap.set('ML2',{
  simStartTime: Date.now(),
  fExpiry: "20JUL26",
  oExpiry: "16JUL26",
  oExpiryNxt: "17AUG26",
  stockCode: 'CRUDEOIL',
  exchange: 'MCX',
  lscount: lscount,
  mode: 'S1TSADMINS',
  lotsize: 100,
  appid: '431c0a81-0558-4ad7-8b4c-1ea5bf3775b4'
});
const urlParams = new URLSearchParams(window.location.search);
const i = urlParams.get('instrument');
const instrument = instrumentMap.get(i);