const nTVtime = unixtime => Math.round(unixtime/1000) + 330 * 60;
const sTVtime = datetime => Math.round(Date.parse(datetime)/1000) + 330 * 60;

function setFuturesChart(qA)
{
  var qs = qA.filter((e) => !(e.datetime.includes('9:00') || e.datetime.includes('9:05')));
  for(var i = 0; i < qs.length; i++)
  {
    qs[i].time = sTVtime(qs[i].datetime);
    qs[i].value = (2/21) * qs[i].close + (1-2/21) * (i !== 0 ? qs[i-1].value : qs[0].close);
    qs.at(-1).customValues = qs.at(-1).value;
  }
  mainSeries.setData(qs);
  emaSeries.setData(qs);
}

function fetchLastCandle(q)
{
  if(mainSeries.data().length !== 0)
    return mainSeries.data().at(-1);
  else
    return {
        time: nTVtime(q.ltt) - nTVtime(q.ltt) % 300, 
        close: q.close,
        open: q.close,
        high: q.close,
        low: q.close,         
        customValues: q.close
      };
}

function futuresChart(q)
{
  var lastcandle = fetchLastCandle(q); 
  if(lastcandle.time + 300 < nTVtime(q.ltt))
  {  
    lastcandle.close = q.close;
    lastcandle.open = q.close;
    lastcandle.high = q.close;
    lastcandle.low = q.close;
    lastcandle.value =  (2/21) * q.close + (1-2/21) * lastcandle.customValues;
    lastcandle.customValues = lastcandle.value;
    lastcandle.time = lastcandle.time + 300;
  }
  else
  {
    lastcandle.high = Math.max(q.close, lastcandle.high);
    lastcandle.low = Math.min(q.close, lastcandle.low);
    lastcandle.close = q.close;
    lastcandle.value =  (2/21) * q.close + (1-2/21) * lastcandle.customValues;
  }      
  mainSeries.update(lastcandle);
  emaSeries.update(lastcandle);
}

function vixChart(q)
{
  if(mainSeries.data().length > 0)
  {
    var qTime = mainSeries.data().at(-1).time;
    vixSeries.update({"time": qTime, "value": Number(q.close)});  
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