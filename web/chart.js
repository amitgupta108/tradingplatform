var lastCandle = { time: instrument.simStartTime / 1000 + 330 * 60 };

function setFuturesChart(qs)
{
  lastCandle = {time: 0};
  for (var i = 0; i < qs.length; i++)
  {
    qs[i].value = i === 0 ? (qs[i].close + qs[i].open)/2 : qs[i].close*(2/21) + qs[i-1].value*(1 - 2/21);
    qs[i].time = (Date.parse(qs[i].datetime)/1000) + 330*60;
  }
  mainSeries.setData(qs);
  emaSeries.setData(qs);
 
  lastCandle = qs[qs.length - 1];
  lastCandle.m = lastCandle.value;
  lastCandle.time = instrument.simStartTime / 1000 + 330 * 60;
}

function updateFuturesChart(q)
{

  if ((q.ltt / 1000 + 330*60) >= lastCandle.time) //5 min candle
  {
    lastCandle.time = lastCandle.time + 5*60;
    lastCandle.high = q.close;
    lastCandle.low = q.close;
    lastCandle.open = q.close;
    lastCandle.close = q.close;
    lastCandle.m = lastCandle.value === undefined ? q.close : lastCandle.value;
    lastCandle.value = (2/21)*q.close + (1-2/21)*lastCandle.m; 
  }  
  else
  {   
    lastCandle.high = Math.max(lastCandle.high, q.close);
    lastCandle.low = Math.min(lastCandle.low, q.close);
    lastCandle.close = q.close;
    lastCandle.value = (2/21)*q.close + (1-2/21)*lastCandle.m;  
  }
  
  mainSeries.update(lastCandle);
  emaSeries.update(lastCandle);
}

function updateIndexChart(uQuote)
{
  var uQuoteTime = new Date(uQuote.datetime).setSeconds(0)/1000+330*60;
  nifty.update({"time": uQuoteTime, "value": uQuote.close});
}

function setChartQuotes(optionChainQuotes)
{
  var cTime = serverTime;
  cTime = (((new Date(cTime)).setSeconds(0))/1000)+330*60;

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
    uq[i].time = new Date(uq[i].datetime).getTime()/1000 + 330*60;
    uq[i].value = uq[i].close;
  }
  nifty.setData(uq);

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
    peQuotes[i].time = (Date.parse(peQuotes[i].datetime)/1000 + 330*60);
    peQuotes[i].value = peQuotes[i].close;

    ceQuotes[i].time = (Date.parse(ceQuotes[i].datetime)/1000  + 330*60);
    ceQuotes[i].value = ceQuotes[i].close;
    
    stPoints[i] = {time: peQuotes[i].time,
        value: ceQuotes[i].value + peQuotes[i].value,};
  }
  peSeries.setData(peQuotes);
  ceSeries.setData(ceQuotes);
  stratSeries.setData(stPoints);
}