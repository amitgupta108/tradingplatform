const nTVtime = unixtime => Math.round(unixtime/1000) + 330 * 60;
const sTVtime = datetime => Math.round(Date.parse(datetime)/1000) + 330 * 60;
const ema_alpha = 2/21;
const ema_beta = 1 - ema_alpha;

class ChartEventEmitter extends EventTarget {

  constructor(){
    super();
    this.symbols = [];
    qBox.addEventListener('strikex', this);
  }

  handleEvent(event)
  {
    const q = event.detail;
    if(this.symbols.includes(q.symbol))
      this.dispatchEvent(generateEvent(q.symbol, q));
  }
  
  addEventListener(symbol, handler){
    this.symbols.push(symbol);
    super.addEventListener(symbol, handler);
  }

  removeEventListener(symbol, handler){
    const idx = this.symbols.findIndex((s) => s === symbol);
    if(idx !== -1)
      this.symbols.slice(idx);
    super.removeEventListener(symbol, handler);
  }
}

const ChartEventer = new ChartEventEmitter();

function setInitialChart(key, withEma, qA)
{
  if(qA === undefined || qA === null || qA.length === 0)
    return;
  var qs = initialSeriesData(qA, withEma);  
  series[key].setData(qs);
  
  if(withEma)
  {
    const seriesName = key === 'futures' ? 'fEma' : 'iEma';
    series[seriesName].setData(qs);
  }
}

function initialSeriesData(qA, withEma = false)
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

const series = {
  vix: '',
  futures: '',
  index: '',
  fEma: '',
  iEma: '',
  strike_1: '',
  strike_2: '',
  strategy_1: ''
};

class Chart 
{
  constructor(container, options) 
  {
    this.maxcount = 3;
    this.symbols = new Array(this.maxcount);

    this.setupChart(container, options);  
    
    this.series = new Array(this.maxcount);
    this.setupSeries(this.maxcount);
    this.listener = this.renderLiveStream;

    this.lastdp = new Array(this.maxcount);
    this.histData = new Array(this.maxcount);
    this.withStrategy = false;
  }

  setupChart(container, options)
  {
    this.chart = LightweightCharts.createChart(container, options);
    this.chart.timeScale().fitContent();
    this.chart.timeScale().scrollToPosition(15);
    this.chart.priceScale('right').applyOptions({
      visible: true,
      mode: 0,
    });
    this.chart.priceScale('left').applyOptions({
      visible: true,
      mode: 0,
    });
  }

  setupSeries()
  {
    this.series[0] = this.chart.addSeries(LightweightCharts.CandlestickSeries,
      { priceScaleId: '',});
    
    this.series[0].priceScale().applyOptions({
      scaleMargins: {top: 0, bottom: 0.70,},
    });

    series['strategy_1'] = this.series[0];

    for(var i = 1; i < this.maxcount; i++) {
      const priceScale = i === 1 ? 'right' : 'left';
      const title = i === 1 ? 'CE' : 'PE';
      this.series[i] = this.chart.addSeries(LightweightCharts.CandlestickSeries, { priceScaleId: priceScale, title: title});
      series[`strike_${i}`] = this.series[i];
    }
  }

  strategyImpl()
  {
    return this.lastdp[1].ltp + this.lastdp[2].ltp;
  }  

  show(strikes, withStrategy) 
  {
    if(strikes.length === this.maxcount)
    {
      this.symbols = strikes;
      for(var i = 1; i < strikes.length; i++)
      {
        if(this.symbols[i] !== undefined)
          ChartEventer.removeEventListener(this.symbols[i], this.listener); 

        this.requestHistory(strikes[i]);
        ChartEventer.addEventListener(strikes[i], this.listener);
      }
      this.withStrategy = withStrategy;
    }
  }
  
  renderLiveStream = (event) => {
    const q = event.detail;
    const s = q.symbol === this.symbols[1] ? 'strike_1' : 'strike_2';
    const idx = q.symbol === this.symbols[1] ? 1 : 2;
    this.lastdp[idx] = q;
    
    renderChart(s, undefined, q);
    if(this.withStrategy && this.lastdp[1] !== undefined && this.lastdp[2] !== undefined)
    {
      const sq = {ltp: this.strategyImpl()};
      sq.ltt = q.ltt;
      renderChart('strategy_1', undefined, sq);
    }
  }

  renderHistory(qA) 
  {    
    const qs = initialSeriesData(qA);
    if (qs && qs.length > 0) {
      const symbol = getSymbol(qs[0]);
      const idx = symbol === this.symbols[1]? 1 : 2;
      this.series[idx].setData(qs);
      this.histData[idx] = qs;
    }

    if (this.withStrategy && this.histData.at(1)?.length > 0 && this.histData.at(2)?.length > 0) {
      this.histData[0] = new Array(this.histData[1].length);
      for (var i = 0; i < this.histData[0].length; i++) {
        this.histData[0][i] = {
          close: this.histData[1][i].close + this.histData[2][i].close,
          high: this.histData[1][i].high + this.histData[2][i].high,
          open: this.histData[1][i].open + this.histData[2][i].open,
          low: this.histData[1][i].low + this.histData[2][i].low,
          time: this.histData[1][i].time
        };
      }
      this.series[0].setData(this.histData[0]);
      this.histData = new Array(3);
    }
  }

  requestHistory(symbol)
  {
    const scrip = expandSymbol(symbol);

    const p = historyParams('oExpiry');
    p.strike = scrip.strike_price;
    p.right = scrip.right;
    p.key = 'strikex';

    socket.emit('history', p);
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
  if(chart_strikes.pe !== '' && chart_strikes.ce !== '')
  {
    switchCharts(1);
    options_chart.show(['strategy', chart_strikes.ce, chart_strikes.pe], true);
  }
}