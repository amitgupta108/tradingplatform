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

function currentCandle(q)
{
  var curCandle;
  if(mainSeries.data().length !== 0) {
    curCandle = mainSeries.data().at(-1);
    if(nTVtime(q.ltt) - curCandle.time > 300)
      curCandle.time = nTVtime(q.ltt) - (nTVtime(q.ltt) % 300);
  }
  else
  {  curCandle = { close: q.close,
        open: q.open,
        high: q.high,
        low: q.low,         
        customValues: q.close
      };
    curCandle.time = nTVtime(q.ltt) - (nTVtime(q.ltt) % 300);
  }
  return curCandle;
}

function futuresChart(q)
{
  var curCandle = currentCandle(q); 
  if(nTVtime(q.ltt) > curCandle.time + 299)
  {  
    curCandle.close = q.close;
    curCandle.open = q.open;
    curCandle.high = q.high;
    curCandle.low = q.low;
    curCandle.value =  (2/21) * q.close + (1-2/21) * curCandle.customValues;
    curCandle.customValues = curCandle.value;
    
    curCandle.time = curCandle.time + 300;
  }
  else
  { 
    curCandle.high = Math.max(q.high, curCandle.high);
    curCandle.low = Math.min(q.low, curCandle.low);
    curCandle.close = q.close;
    curCandle.value =  (2/21) * q.close + (1-2/21) * curCandle.customValues;
  }      
  mainSeries.update(curCandle);
  emaSeries.update(curCandle);
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