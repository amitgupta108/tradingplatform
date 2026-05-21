
const instrumentMap = new Map();

instrumentMap.set('UI', {
  fExpiry: "24FEB26",
  simStartTime: new Date("2026-02-12 09:21:00").getTime(),
  oExpiry: "17FEB26",
  oExpiryNxt: "24FEB26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: 10,
  mode: 2,
  lotsize: 65,
  appid: '431c0a81-0558-4ad7-8b4c-1ea5bf3775b4'
});

instrumentMap.set('NH2', {
  fExpiry: "30MAR26",
  simStartTime: new Date("2026-03-13 09:15:00").getTime(),
  oExpiry: "17MAR26",
  oExpiryNxt: "24MAR26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: 10,
  mode: 0,
  lotsize: 65,
  appid: 'b6033d82-1d88-470a-bf28-58b217f098e7'
});

instrumentMap.set('NH1', {
  simStartTime: new Date("2026-02-11 09:15:00").getTime(),
  fExpiry: "24FEB26",
  oExpiry: "17FEB26",
  oExpiryNxt: "24FEB26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: 10,
  mode: 0,
  lotsize: 65,
  appid: '5be36ca0-44e8-44d9-b739-4864c6dfc553'
});

instrumentMap.set('NL1', {
  simStartTime: Date.now(),
  fExpiry: "26MAY26",
  oExpiry: "26MAY26",
  oExpiryNxt: "02JUN26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: 12,
  mode: 1,
  lotsize: 65,
  appid: '0cd4a0ed-c4a1-4318-940b-b4d3841468d9'
});

instrumentMap.set('NL2', {
  simStartTime: Date.now(),
  fExpiry: "26MAY26",
  oExpiry: "26MAY26",
  oExpiryNxt: "02JUN26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: 12,
  mode: 1,
  lotsize: 65,
  appid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

instrumentMap.set('NP1', {
  simStartTime: Date.now(),
  fExpiry: "26MAY26",
  oExpiry: "12MAY26",
  oExpiryNxt: "19MAY26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: 12,
  mode: 2,
  lotsize: 65,
  appid: crypto.randomUUID
});

instrumentMap.set('MP1',{
  simStartTime: Date.now(),
  fExpiry: "18JUN26",
  oExpiry: "16JUN26",
  oExpiryNxt: "16JUN26",
  stockCode: 'CRUDEOIL',
  exc: 'MCX',
  lscount: 10,
  mode: 2,
  lotsize: 100,
  appid: 'sM2wzV0S-x3Ca-SVQI-AAAH-940b886ee155'
});

instrumentMap.set('ML1',{
  simStartTime: Date.now(),
  fExpiry: "18JUN26",
  oExpiry: "16JUN26",
  oExpiryNxt: "16JUL26",
  stockCode: 'CRUDEOIL',
  exc: 'MCX',
  lscount: 10,
  mode: 1,
  lotsize: 100,
  appid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

instrumentMap.set('ML2',{
  simStartTime: Date.now(),
  fExpiry: "18JUN26",
  oExpiry: "16JUN26",
  oExpiryNxt: "16JUL26",
  stockCode: 'CRUDEOIL',
  exc: 'MCX',
  lscount: 10,
  mode: 1,
  lotsize: 100,
  appid: '431c0a81-0558-4ad7-8b4c-1ea5bf3775b4'
});

const lscount = 10;
const urlParams = new URLSearchParams(window.location.search);
const i = urlParams.get('instrument');
const instrument = instrumentMap.get(i);

const chartOptions = {
  height: 0, width: 0, 
  autoSize: true,
  layout: {
      textColor: 'black',
      background: { type: 'solid', color: '#f4f4f4'},
  	},
    crosshair: {
      mode: 0, // CrosshairMode.Normal
    },
    timeScale: {		
      minBarSpacing: 2,
      visible: true,	
      timeVisible: true,
      secondsVisible: false,
      tickMarkMaxCharacterLength: 5,
	  },
    rightPriceScale: {
      visible: true,
    },
    leftPriceScale: {
      visible: true,
    },
    handleScale: {
      axisPressedMouseMove: {
          time: true,
          price: true,
      },
    },
};

const chart = LightweightCharts.createChart('futures_chart', chartOptions);
chart.timeScale().fitContent();
chart.timeScale().scrollToPosition(15);

const mainSeries = chart.addSeries(LightweightCharts.CandlestickSeries);
const emaSeries = chart.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2 });
const vixSeries = chart.addSeries(LightweightCharts.LineSeries, { priceScaleId: 'left', color: 'rgb(242, 142, 44)', lineWidth: 2 });