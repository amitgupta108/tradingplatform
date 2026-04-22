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
  uid: '431c0a81-0558-4ad7-8b4c-1ea5bf3775b4'
});

instrumentMap.set('NH2', {
  fExpiry: "24FEB26",
  simStartTime: new Date("2026-02-12 09:21:00").getTime(),
  oExpiry: "17FEB26",
  oExpiryNxt: "24FEB26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: 10,
  mode: 0,
  lotsize: 65,
  uid: 'b6033d82-1d88-470a-bf28-58b217f098e7'
});


instrumentMap.set('NH1', {
  simStartTime: new Date("2026-02-10 10:21:00").getTime(),
  fExpiry: "24FEB26",
  oExpiry: "10FEB26",
  oExpiryNxt: "17FEB26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: 10,
  mode: 0,
  lotsize: 65,
  uid: '5be36ca0-44e8-44d9-b739-4864c6dfc553'
});

instrumentMap.set('NL1', {
  simStartTime: Date.now(),
  fExpiry: "28APR26",
  oExpiry: "28APR26",
  oExpiryNxt: "05MAY26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: 12,
  mode: 1,
  lotsize: 65,
  uid: '0cd4a0ed-c4a1-4318-940b-b4d3841468d9'
});

instrumentMap.set('NL2', {
  simStartTime: Date.now(),
  fExpiry: "28APR26",
  oExpiry: "21APR26",
  oExpiryNxt: "28APR26",
  stockCode: 'NIFTY',
  exc: 'NFO',
  lscount: 12,
  mode: 1,
  lotsize: 65,
  uid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

instrumentMap.set('ML',{
  simStartTime: new Date(Date.now()),
  fExpiry: "18MAY26",
  oExpiry: "14MAY26",
  oExpiryNxt: "16JUN26",
  stockCode: 'CRUDEOIL',
  exc: 'MCX',
  lscount: 10,
  mode: 1,
  lotsize: 100,
  uid: '886ee155-38d9-49c1-9e18-b17551e8a4be'
});

const lscount = 10 ;
const urlParams = new URLSearchParams(window.location.search);
const i = urlParams.get('instrument');
const instrument = instrumentMap.get(i);
const chbk = instrument.mode === 1 ? 'lightgray' : 'white';

const chartOptions = {
  width: 665, height: 790,
  layout: {
      textColor: 'black',
      background: { type: 'solid', color: chbk},
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

const chart = LightweightCharts.createChart(document.getElementById('chart1'), chartOptions);
const ts = chart.timeScale();

const mainSeries = chart.addSeries(LightweightCharts.CandlestickSeries);
const emaSeries = chart.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2 });
const vixSeries = chart.addSeries(LightweightCharts.LineSeries, { priceScaleId: 'left', color: 'rgb(242, 142, 44)', lineWidth: 2 });
//const IVNxtSeries = chart.addSeries(LightweightCharts.LineSeries, { priceScaleId: 'left', color: 'rgb(14, 122, 8)', lineWidth: 2 });

chart.timeScale().fitContent();
chart.timeScale().scrollToPosition(15);
/*
const chart2 = LightweightCharts.createChart(document.getElementById('chart2'), chartOptions);
const peSeries = chart2.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2});  
const ceSeries = chart2.addSeries(LightweightCharts.LineSeries, { color: 'rgb(242, 142, 44)', lineWidth: 2});
const stratSeries = chart2.addSeries(LightweightCharts.LineSeries, { color: 'rgb(225, 22, 22)', lineWidth: 2, title: 'QuaterDelta' });
const nifty = chart2.addSeries(LightweightCharts.LineSeries, { priceScaleId: 'left', color: 'rgb(12, 140, 14)', lineWidth: 2, title: 'Nifty' });  
*/