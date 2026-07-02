const nTVtime = unixtime => Math.round(unixtime/1000) + 330 * 60;
const sTVtime = datetime => Math.round(Date.parse(datetime)/1000) + 330 * 60;
const ema_alpha = 2/21;
const ema_beta = 1 - ema_alpha;

function setInitialChart(key, withEma, qA)
{
  if(qA === undefined || qA === null || qA.length === 0)
    return;
  var qs = initialSeriesData(qA);  
  series[key].setData(qs);
  
  if(withEma)
  {
    const seriesName = key === 'futures' ? 'fEma' : 'iEma';
    series[seriesName].setData(qs);
  }
}

function initialSeriesData(qA)
{
  var qs = qA.filter((e) => !(e.datetime.includes('9:00') ||e.datetime.includes('9:05') || e.datetime.includes('9:10')));
  for(var i = 0; i < qs.length; i++)
  {
    qs[i].time = i === 0 || qs[i].datetime.includes('9:15') ? sTVtime(qs[i].datetime) : qs[i-1].time + 5 * 60;
    //qs[i].time = sTVtime(qs[i].datetime);
    qs[i].value = ema_alpha * qs[i].close + ema_beta * (i !== 0 ? qs[i-1].value : qs[0].close);
    qs.at(-1).customValues = qs.at(-1).value;
  }
  return qs;
}

function renderChart(main, ema, q)
{
  const mainSeries = series[main];
  const emaSeries = series[ema];

  var curCandle = mainSeries.data().at(-1);
  if(curCandle === undefined || nTVtime(q.ltt) - curCandle.time > 299)
  {  
    const ema = ema_alpha * q.ltp + ema_beta * (curCandle !== undefined ? curCandle.customValues : q.ltp);
  
    curCandle = {
      time: nTVtime(q.ltt) - (nTVtime(q.ltt) % 300), 
      open: (curCandle) ? curCandle.close : q.open ?? q.ltp, 
      high: q.ltp, 
      low: q.ltp, 
      close: q.ltp,
      value: ema,
      customValues: ema,
    };
  }
  else
  { 
    curCandle.high = Math.max(q.ltp, curCandle.high);
    curCandle.low = Math.min(q.ltp, curCandle.low);
    curCandle.close = q.ltp;
    curCandle.value =  ema_alpha * q.ltp + ema_beta * curCandle.customValues;
  }      
  mainSeries.update(curCandle);
  if(emaSeries !== undefined)
    emaSeries.update(curCandle);
}

class Chart {
  constructor(container, options) 
  {
    if (this.chart === undefined) {
      this.chart = LightweightCharts.createChart(container, options);
      
      this.series = new Array(3);
      this.series[0] = this.chart.addSeries(LightweightCharts.CandlestickSeries, { priceScaleId: 'right', title: 'CE' });
      this.series[1] = this.chart.addSeries(LightweightCharts.CandlestickSeries, { priceScaleId: 'right', title: 'PE'});
      this.series[2] = this.chart.addSeries(LightweightCharts.CandlestickSeries, {});
      
      this.chart.timeScale().fitContent();
      this.chart.timeScale().scrollToPosition(15);
      this.chart.priceScale('right').applyOptions({
        visible: true,
        autoScale: true,
        mode: 0,
      });
    }

    this.symbols = Array(2);
    this.lastdp = [];
    this.strategy = (p1, p2) => p1 + p2;
  }

  addReplaceStrike(symbols) 
  {
    if(symbols?.length === 0)
      return
    
    this.checkListener();
    for(const s of symbols)
    {
      this.renderHistory(s);
    }
  }

  checkListener(){
    if(socket.listeners('opt_history').length === 0){
      socket.on('opt_history', (key, qA) => {
        const qs = initialSeriesData(qA);
        if (qs && qs.length > 0) {
          const idx = qs[0].right === 'Call' ? 0 : 1;
          this.series[idx].setData(qs);
        }
      });
    }
  }
  
  renderHistory(symbol) {

    if (symbol !== undefined && symbol.endsWith('CE'))
      this.symbols[0] = symbol;
    else if (symbol !== undefined && symbol.endsWith('PE'))
      this.symbols[1] = symbol;

    const scrip = expandSymbol(symbol);

    const p = historyParams('oExpiry');
    p.strike = scrip.strike_price;
    p.right = scrip.right;
    p.key = 'strikex';

    socket.emit('history', p);
  }

  updateChart(seriesnames, qs) {

  }

  addseries(seriesnames) {

  }
}

const charts = {
  futures: { container: 'futures_chart' },
  index: { container: 'index_chart' },
  strikes: { container: 'strikes_chart' }
};

const chartOptions = {
  autoSize: true,
  layout: {
    textColor: '#f4f4f48b',
    background: { color: '#1d1616c8' },
    attributionLogo: false,
  },
  grid: {
    vertLines: {
      color: '#f4f4f43f',
      style: 2,
      visible: true
    },
    horzLines: {
      color: '#f4f4f43f',
      style: 2,
      visible: true
    },
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

const chart1 = LightweightCharts.createChart(charts['futures'].container, chartOptions);
const chart2 = LightweightCharts.createChart(charts['index'].container, chartOptions);
const options_chart = new Chart(charts['strikes'].container, chartOptions);
//const chart_strikes = LightweightCharts.createChart(container.strikes, chartOptions);
//const chart_strategy = LightweightCharts.createChart(container.strategy, chartOptions);

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

const series = {
  vix: '',
  futures: '',
  index: '',
  fEma: '',
  iEma: '',
  strike_1: '',
  strike_2: '',
  strategy_1: ''
}

series.vix = chart1.addSeries(LightweightCharts.CandlestickSeries, {});
series.futures = chart1.addSeries(LightweightCharts.CandlestickSeries, { priceScaleId: 'right' });
series.fEma = chart1.addSeries(LightweightCharts.LineSeries, { priceScaleId: 'right', color: '#2962FF', lineWidth: 2 });
chart1.timeScale().fitContent();
chart1.timeScale().scrollToPosition(15);

series.index = chart2.addSeries(LightweightCharts.CandlestickSeries, {});
series.iEma = chart2.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2 });
chart2.timeScale().fitContent();
chart2.timeScale().scrollToPosition(15);

function showChart(){
  switchCharts(1);
  options_chart.addReplaceStrike(['NIFTY30JUN2624500CE', 'NIFTY30JUN2624000PE']);
}