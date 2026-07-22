const nTVtime = unixtime => Math.round(unixtime/1000) + 330 * 60;
const sTVtime = datetime => Math.round(Date.parse(datetime)/1000) + 330 * 60;
const ema_alpha = 2/21;
const ema_beta = 1 - ema_alpha;
const ema = (previous, current) => {
  return ema_alpha * current + ema_beta * previous;
};

class ChartEventEmitter extends EventTarget {

  constructor(){
    super();
    this.symbols = [];
    qBox.addEventListener('index', this);
    qBox.addEventListener('futures', this);
    qBox.addEventListener('vix', this);

  }

  run(symbols) {
    this.symbols = symbols;
    qBox.addEventListener('strikex', this);
  }

  handleEvent(event)
  {
    const q = event.detail;
    if(event.type === 'index')
      renderChart(series['index'], series['iEma'], q);
    else if (event.type === 'futures')
      renderChart(series['futures'], series['fEma'], q);
    else if (event.type === 'vix')
      renderChart(series['vix'], undefined, q);
    else if (event.type === 'strikex')
    {
      const idx = this.symbols.findIndex((s) => s === q.symbol);
      if(idx !== -1)
        this.dispatchEvent(generateEvent(''+idx, q));
    }
  }
  
  stop() {
    qBox.removeEventListener('strikex', this);
  }
}
const ChartEventer = new ChartEventEmitter();

function setInitialChart(key, qA)
{
  const withEma = ['futures', 'index'].includes(key) ? true : false;
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
  if (qA === undefined || qA === null || qA.length === 0)
    return;

  var qs = qA.filter((e) => !(e.datetime.includes('9:00') ||e.datetime.includes('9:05') || e.datetime.includes('9:10')));
  for(var i = 0; i < qs.length; i++)
  {
    qs[i].time = i === 0 || qs[i].datetime.includes('9:15') ? sTVtime(qs[i].datetime) : qs[i-1].time + 5 * 60;
    if(withEma)
      qs[i].value = i === 0 ? qs[i].close : ema(qs[i-1].value, qs[i].close);
  }
  return qs;
}

function renderChart(series_main, series_ema, q)
{
  var curCandle = series_main.data().at(-1);
  let c;
  if (curCandle === undefined || nTVtime(q.ltt) - curCandle.time > 299)
    c = newCandle(q, curCandle);
  else
    c = updateCandle(q, curCandle);

  series_main.update(c);

  if (series_ema !== undefined)
    series_ema.update({ time: c.time, value: ema(c.value ?? q.ltp, q.ltp)}) 
}

function newCandle(q, curCandle){
  return {
    time: nTVtime(q.ltt) - (nTVtime(q.ltt) % 300),
    open: (curCandle) ? curCandle.close : q.open ?? q.ltp,
    high: q.ltp,
    low: q.ltp,
    close: q.ltp
  };
}

function updateCandle(q, curCandle){
  curCandle.high = Math.max(q.ltp, curCandle.high);
  curCandle.low = Math.min(q.ltp, curCandle.low);
  curCandle.close = q.ltp;

  return curCandle;
}

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
    this.chart.priceScale('right').applyOptions({
      visible: true,
      mode: 0,
    });
  }

  setupSeries()
  {
    for (var i = 0; i < this.maxcount; i++) {
      //const priceScale = i % 2 === 0 ? 'right' : 'left';
      this.series[i] = this.chart.addSeries(LightweightCharts.CandlestickSeries,
        { priceScaleId: 'right', title: `${i}`});
      ChartEventer.addEventListener(`${i}`, this);
    }
    this.strategy = this.chart.addSeries(LightweightCharts.CandlestickSeries,
      { priceScaleId: 'right', title: 'ST'});
    this.chart.timeScale().fitContent();
    this.chart.timeScale().scrollToPosition(15);
  }

  strategyImpl()
  {
    let strategy_price = 0;
    for (var i = 0; i < this.maxcount; i++) {
      if(this.lastdp[i] === undefined)
        return 0;

      strategy_price += this.lastdp[i].ltp;
    }
    return strategy_price;
  }  

  show(strikes, withStrategy = true) 
  {
    this.symbols = strikes.slice(0, this.maxcount);
    this.requestHistory(this.symbols);
    this.currentcount = 0;
    for (var i = 0; i < this.maxcount; i++) {
      this.position[strikes[i]] = i; 
      this.series[i].applyOptions({ title: this.symbols[i].slice(-7) });
    }
    this.withStrategy = withStrategy;
  }
  
  handleEvent(event) {
    const q = event.detail;
    if(!this.symbols.includes(q.symbol))
      return;

    const idx = this.position[q.symbol];
    renderChart(this.series[idx], undefined, q);
    this.lastdp[idx] = q;

    if(this.withStrategy)
    {
      const ltp = this.strategyImpl();
      if(ltp !== 0) 
        renderChart(this.strategy, undefined, {ltp: ltp, ltt: q.ltt});      
    }
  }

  renderHistory(qA) 
  {    
    const qs = initialSeriesData(qA);
    if (qs && qs.length > 0) {
      const symbol = getSymbol(qs[0]);
      const idx = this.position[symbol];
      this.series[idx].setData(qs);
      this.histData[idx] = qs;
      ++this.currentcount;
    }

    if (this.withStrategy && this.currentcount === this.maxcount) {
      let aggregate_hist = [];
      
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
      aggregate_hist = [];
    }
  }

  requestHistory(symbols)
  {
    const requests = new Array();
    for(const s of symbols){
      const p = historyParams('oExpiry');
      const scrip = expandSymbol(s);
      p.strike = scrip.strike_price;
      p.right = scrip.right;
      p.key = 'strikex';
      p.symbol = s;

      requests.push(p);
    }
    socket.emit('history', requests);
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

const priceScaleOptions = {
  visible: true,
  autoScale: true,
  mode: 0,
};
chart1.priceScale('left').applyOptions(priceScaleOptions);

const series = {
  vix: chart1.addSeries(LightweightCharts.CandlestickSeries, {priceScaleId: 'left'}),
  futures: chart1.addSeries(LightweightCharts.CandlestickSeries, { priceScaleId: 'right' }),
  fEma: chart1.addSeries(LightweightCharts.LineSeries, { priceScaleId: 'right', color: '#2962FF', lineWidth: 2 }),
  index: chart2.addSeries(LightweightCharts.CandlestickSeries, { priceScaleId: 'right' }),
  iEma: chart2.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2 }),
};

chart1.timeScale().fitContent();
chart1.timeScale().scrollToPosition(15);
chart2.timeScale().fitContent();
chart2.timeScale().scrollToPosition(15);