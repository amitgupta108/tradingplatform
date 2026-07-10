const nTVtime = unixtime => Math.round(unixtime/1000) + 330 * 60;
const sTVtime = datetime => Math.round(Date.parse(datetime)/1000) + 330 * 60;
const ema_alpha = 2/21;
const ema_beta = 1 - ema_alpha;

class ChartEventEmitter extends EventTarget {

  constructor(){
    super();
    this.symbols = [];
  }

  run(symbols) {
    this.symbols = symbols;
    qBox.addEventListener('strikex', this);
  }

  handleEvent(event)
  {
    const q = event.detail;
    const idx = this.symbols.findIndex((s) => s === q.symbol);
    if(idx !== -1)
      this.dispatchEvent(generateEvent(''+idx, q));
  }
  
  stop() {
    qBox.removeEventListener('strikex', this);
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
    if(withEma) {
      qs[i].value = ema_alpha * qs[i].close + ema_beta * (i !== 0 ? qs[i-1].value : qs[0].close);
      qs.at(-1).customValues = qs.at(-1).value;
    }
  }
  return qs;
}

function renderChart(main, ema, q)
{
  const mainSeries = series[main];
  const emaSeries = series[ema];
  renderSeries(mainSeries, emaSeries, q);
}

function renderSeries(c, e, q){
  var curCandle = c.data().at(-1);
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
  c.update(curCandle);
  if(e !== undefined)
    e.update(curCandle);
}

const series = {
  vix: '',
  futures: '',
  index: '',
  fEma: '',
  iEma: '',
  strategy_1: ''
};

class Chart 
{
  constructor(container, options) 
  {
    this.maxcount = 2;
    this.currentcount = 0;
    this.position = {};
    this.symbols = new Array(this.maxcount);
    this.series = new Array(this.maxcount);
    this.lastdp = new Array(this.maxcount);
    this.histData = new Array(this.maxcount);

    this.strategy;
    this.withStrategy = true;
    
    this.setupChart(container, options);  
    this.setupSeries();
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
    for (var i = 0; i < this.maxcount; i++) {
      const priceScale = i % 2 === 0 ? 'right' : 'left';
      this.series[i] = this.chart.addSeries(LightweightCharts.CandlestickSeries,
        { priceScaleId: priceScale, title: `${i}`});
      ChartEventer.addEventListener(`${i}`, this);
    }

    this.strategy = this.chart.addSeries(LightweightCharts.CandlestickSeries,
      { priceScaleId: 'right', title: 'ST'});
  }

  strategyImpl()
  {
    let strategy_price = 0;
    for (var i = 0; i < this.maxcount; i++) {
      if(this.lastdp[i] !== undefined)
        strategy_price += this.lastdp[i].ltp;
    }
    return strategy_price;
  }  

  show(strikes, withStrategy = true) 
  {
    this.symbols = strikes.slice(0, this.maxcount);
    this.currentcount = 0;
    for (var i = 0; i < this.maxcount; i++) {
      this.position[strikes[i]] = i; 
      this.requestHistory(strikes[i]);
    }
    this.withStrategy = withStrategy;
  }
  
  handleEvent(event) {
    const q = event.detail;
    if(this.symbols.includes(q.symbol))
    {
      const idx = this.position[q.symbol];
      renderSeries(this.series[idx], undefined, q);
      this.lastdp[idx] = q;

      if(this.withStrategy)
      {
        const sq = {ltp: this.strategyImpl()};
        sq.ltt = q.ltt;
        renderSeries(this.strategy, undefined, sq);
      }
    }
  }

  renderHistory(qA) 
  {    
    const qs = initialSeriesData(qA);
    if (qs && qs.length > 0) {
      const symbol = getSymbol(qs[0]);
      const idx = this.position[symbol];
      this.series[idx].applyOptions({ title: symbol.slice(-7) });
      this.series[idx].setData(qs);
      this.histData[idx] = qs;
      ++this.currentcount;
    }

    if (this.withStrategy && this.currentcount === this.maxcount) {
      const aggregate_hist = [];
      
      for (var i = 0; i < this.histData[0].length; i++) {
        aggregate_hist[i] = {
          time: this.histData[0][i].time,
          close: 0, high: 0,
          open: 0, low: 0,
        };
        for (var j = 0; j < this.maxcount; j++) {
          aggregate_hist[i]['close'] += this.histData[j][i]['close'];
          aggregate_hist[i]['high'] += this.histData[j][i]['high'];
          aggregate_hist[i]['open'] += this.histData[j][i]['open'];
          aggregate_hist[i]['low'] += this.histData[j][i]['low'];
        };
      }
      this.strategy.setData(aggregate_hist);
      this.histData = [];
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

const gridLineOptions = {
  color: '#f4f4f43f',
  style: 2,
  visible: true
};

const chartOptions = {
  autoSize: true,
  layout: {
    textColor: '#f4f4f48b',
    background: { color: '#1d1616c8' },
    attributionLogo: false,
  },
  grid: {
    vertLines: gridLineOptions,
    horzLines: gridLineOptions,
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
  defaultVisiblePriceScaleId: 'right',
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

const priceScaleOptions = {
  visible: true,
  autoScale: true,
  mode: 0,
};
chart1.priceScale('left').applyOptions(priceScaleOptions);
//chart1.priceScale('right').applyOptions(priceScaleOptions);

series.vix = chart1.addSeries(LightweightCharts.CandlestickSeries, {priceScaleId: 'left'});
series.futures = chart1.addSeries(LightweightCharts.CandlestickSeries, { priceScaleId: 'right' });
series.fEma = chart1.addSeries(LightweightCharts.LineSeries, { priceScaleId: 'right', color: '#2962FF', lineWidth: 2 });
chart1.timeScale().fitContent();
chart1.timeScale().scrollToPosition(15);

series.index = chart2.addSeries(LightweightCharts.CandlestickSeries, {priceScaleId: 'right'});
series.iEma = chart2.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2 });
chart2.timeScale().fitContent();
chart2.timeScale().scrollToPosition(15);

function showChart(){
    switchCharts(1);
    const rows = oc_container.querySelectorAll('tr.row_background');
    if(rows.length === 0)
      return;
    const symbols = Array.from(rows).map((r) =>  r.title);
    ChartEventer.run(symbols);
    options_chart.show(symbols, true);
}