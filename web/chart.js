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
    qs[i].time = sTVtime(qs[i].datetime);
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

const container = {
  futures: 'futures_chart',
  index: 'index_chart',
  strangle_1: 'container_2',
  strangle_2: 'container_3',
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
      lineStyle: 2
    },
    horzLines: {
      color: '#f4f4f43f',
      lineStyle: 2
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

const chart1 = LightweightCharts.createChart(container.futures, chartOptions);

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
  strangle_1: '',
}

series.vix = chart1.addSeries(LightweightCharts.CandlestickSeries, {});
series.futures = chart1.addSeries(LightweightCharts.CandlestickSeries, { priceScaleId: 'right' });
series.fEma = chart1.addSeries(LightweightCharts.LineSeries, { priceScaleId: 'right', color: '#2962FF', lineWidth: 2 });
chart1.timeScale().fitContent();
chart1.timeScale().scrollToPosition(15);

const chart2 = LightweightCharts.createChart(container.index, chartOptions);
series.index = chart2.addSeries(LightweightCharts.CandlestickSeries, {});
series.iEma = chart2.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2 });
chart2.timeScale().fitContent();
chart2.timeScale().scrollToPosition(15);

/*
function updateIndexChart(uQuote)
{
  var uQuoteTime = sTVtime(new Date(uQuote.datetime).setSeconds(0));
  indexSeries.update({"time": uQuoteTime, "value": uQuote.close});
}

function setChartQuotes(optionChainQuotes)
{
  var cTime = serverTime;
  cTime = sTVtime(new Date(cTime)).setSeconds(0);

  for(var i = 0; i < optionsChartConfig.length; i++)
  {
    for(var j = 0; j < optionsChartConfig[i].attributeSet.length; j++)
    {
      var strikeRep = optionsChartConfig[i].attributeSet[j];
      var index = findItemIndex(strikeRep, optionChainQuotes);
      optionsChartConfig[i].tick.time = cTime;
      if(index != -1)
        optionsChartConfig[i].tick.prices[j] = optionChainQuotes[index].close;  
    }
  }
}

function updateOptionsChart()
{
  for(var i = 0; i < optionsChartConfig.length; i++)
  {
    var cPrice = 0; var cTime = 0;
    for(var j = 0; j < optionsChartConfig[i].attributeSet.length; j++)
    {
      cPrice += optionsChartConfig[i].tick.prices[j];
    }
    cTime = optionsChartConfig[i].tick.time;
    if( cPrice != 0 && cTime != 0)
      optionsChartConfig[i].lineRef.update({"time": cTime, "value": cPrice});
  }
}

function setUpInitialNiftyChart(uq)
{
  for(var i = 0; i < uq.length; i++)
  { 
    uq[i].time = sTVtime(uq[i].datetime);
    uq[i].value = uq[i].close;
  }
  indexSeries.setData(uq);

  chart2.timeScale().fitContent();
  chart2.timeScale().scrollToPosition(5);
}

function setUpInitialOptionsChart(peQuotes, ceQuotes, oExpiry)
{
  setQDeltaStrikesCharts(ceQuotes[0].strike_price, peQuotes[0].strike_price, oExpiry);
  peSeries.applyOptions({title: peQuotes[0].strike_price + " " + peQuotes[0].right});
  ceSeries.applyOptions({title: ceQuotes[0].strike_price + " " + ceQuotes[0].right});

  const stPoints = new Array(peQuotes.length);
  for(var i = 0; i < peQuotes.length; i++)
  {
    peQuotes[i].time = sTVtime(peQuotes[i].datetime);
    peQuotes[i].value = peQuotes[i].close;

    ceQuotes[i].time = sTVtime(ceQuotes[i].datetime);
    ceQuotes[i].value = ceQuotes[i].close;
    
    stPoints[i] = {time: peQuotes[i].time,
        value: ceQuotes[i].value + peQuotes[i].value,};
  }
  peSeries.setData(peQuotes);
  ceSeries.setData(ceQuotes);
  stratSeries.setData(stPoints);
}
  */