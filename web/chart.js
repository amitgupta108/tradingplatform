
const nTVtime = unixtime => unixtime/1000 + 330 * 60;
const sTVtime = datetime => Date.parse(datetime)/1000 + 330 * 60;

function setFuturesChart(qs)
{
  for(var i = 0; i < qs.length; i++)
  {
    qs[i].time = sTVtime(qs[i].datetime);
    qs[i].value = (2/21) * qs[i].close + (1-2/21) * (i != 0 ? qs[i-1].value : qs[0].close);
  }
    mainSeries.setData(qs);
    emaSeries.setData(qs);
}

function futuresChart(q)
{
  if(mainSeries.data().length === 0)
  {
    mainSeries.update({time: nTVtime(q.ltt), open: q.close, close: q.close, high: q.close, low: q.close});
    emaSeries.update({time: nTVtime(q.ltt), value: q.close});
    return;
  }
  
  var index = ts.timeToIndex(nTVtime(q.ltt) - 5 * 60, true);
  var curCandle = mainSeries.dataByIndex(index);


  if(nTVtime(q.ltt) < curCandle.time + 5 * 60)
  {
    var data = {high: Math.max(q.close, curCandle.high),
      low: Math.min(q.close, curCandle.low),
      close: q.close, open: curCandle.open, 
      time: curCandle.time
    };
    mainSeries.update(data);
  }
  else
  {
    mainSeries.update({time: nTVtime(q.ltt), open: q.close, close: q.close, high: q.close, low: q.close});
    var emadatapoint = emaSeries.dataByIndex(index);
    emaSeries.update({time: nTVtime(q.ltt), value: (2/21) * q.close + (1-2/21) * emadatapoint.value});
  }
}

function updateIndexChart(uQuote)
{
  var uQuoteTime = sTVtime(new Date(uQuote.datetime).setSeconds(0));
  nifty.update({"time": uQuoteTime, "value": uQuote.close});
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