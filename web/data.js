
const lscount = 9;
const instrumentMap = new Map();

instrumentMap.set('UI', {
  fExpiry: "24FEB26",
  simStartTime: new Date("2026-02-12 09:21:00").getTime(),
  oExpiry: "17FEB26",
  oExpiryNxt: "24FEB26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: lscount,
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
  lscount: lscount,
  mode: 0,
  lotsize: 65,
  appid: 'b6033d82-1d88-470a-bf28-58b217f098e7'
});

instrumentMap.set('NH1', {
  simStartTime: new Date("2026-06-01 09:15:00").getTime(),
  fExpiry: "30JUN26",
  oExpiry: "02JUN26",
  oExpiryNxt: "09JUN26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: lscount,
  mode: 0,
  lotsize: 65,
  appid: '5be36ca0-44e8-44d9-b739-4864c6dfc553'
});

instrumentMap.set('NL1', {
  simStartTime: Date.now(),
  fExpiry: "30JUN26",
  oExpiry: "09JUN26",
  oExpiryNxt: "16JUN26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: lscount,
  mode: 1,
  lotsize: 65,
  appid: '0cd4a0ed-c4a1-4318-940b-b4d3841468d9'
});

instrumentMap.set('NL2', {
  simStartTime: Date.now(),
  fExpiry: "30JUN26",
  oExpiry: "09JUN26",
  oExpiryNxt: "16JUN26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: lscount,
  mode: 3,
  lotsize: 65,
  appid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

instrumentMap.set('NP1', {
  simStartTime: Date.now(),
  fExpiry: "30JUN26",
  oExpiry: "02JUN26",
  oExpiryNxt: "09JUN26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: lscount,
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
  lscount: lscount,
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
  lscount: lscount,
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
  lscount: lscount,
  mode: 3,
  lotsize: 100,
  appid: '431c0a81-0558-4ad7-8b4c-1ea5bf3775b4'
});
const urlParams = new URLSearchParams(window.location.search);
const i = urlParams.get('instrument');
const instrument = instrumentMap.get(i);

const chartOptions = {
  layout: {
    textColor: 'black',
    background: { type: 'solid', color: '#f4f4f4'},
    rendering: {
      type: 'canvas',
    },
    attributionLogo: false,
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
    defaultVisiblePriceScaleId: 'left', 
    handleScale: {
      axisPressedMouseMove: {
          timeScale: true,
          priceScale: true,
      },
    },
};

const chart1 = LightweightCharts.createChart('futures_chart', chartOptions);

chart1.priceScale('left').applyOptions({
    visible: true,
    autoScale: true,
    mode: 0,
});
chart1.priceScale('right').applyOptions({
    visible: true,
    autoScale: true,
    mode: 0,
});

const vixSeries = chart1.addSeries(LightweightCharts.CandlestickSeries, {});
const futuresSeries = chart1.addSeries(LightweightCharts.CandlestickSeries, {priceScaleId: 'right'});
const fEmaSeries = chart1.addSeries(LightweightCharts.LineSeries, { priceScaleId: 'right', color: '#2962FF', lineWidth: 2 });
chart1.timeScale().fitContent();
chart1.timeScale().scrollToPosition(15);

const chart2 = LightweightCharts.createChart('index_chart', chartOptions);
const indexSeries = chart2.addSeries(LightweightCharts.CandlestickSeries, {});
const iEmaSeries = chart2.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2 });
chart2.timeScale().fitContent();
chart2.timeScale().scrollToPosition(15);

