
const nTVtime = unixtime => unixtime/1000 + 330 * 60;
const sTVtime = datetime => Date.parse(datetime)/1000 + 330 * 60;

var lastCandle = {};

/*function futuresChart(qs)
{
  if(mainSeries.data().length === 0)
  {
    if(!Array.isArray(qs))
      qs = [qs];

    var chartpoints = qs.map((e, idx, arr) => {
        e.value = idx === 0 ? (e.close + e.open)/2 : e.close*(2/21) + arr[idx-1].value*(1 - 2/21);
        e.time = sTVtime(e.datetime);
        return e;
    });
    mainSeries.setData(chartpoints);
    emaSeries.setData(chartpoints);
    lastCandle.value = chartpoints[chartpoints.length - 1].value;
    lastCandle.time = chartpoints[chartpoints.length - 1].time;
  }
  else
  {
    if(nTVtime(qs.ltt) >= lastCandle.time)
    {
      lastCandle.t = lastCandle.time;
      lastCandle.time = lastCandle.time + 5 *60;
      lastCandle.m = lastCandle.value === undefined ? qs.close : lastCandle.value;
    }
    qs.time = lastCandle.t;

    lastCandle.value = (2/21) * qs.close + (1-2/21) * lastCandle.m;
    qs.value = lastCandle.value;

    mainSeries.update(qs);
    emaSeries.update(qs);    
  } 
} */

function futuresChart(q)
{
  if(mainSeries.data().length === 0)
  {
    q.time = nTVtime(q.ltt);
    q.value = q.ltp;

    mainSeries.setData([q]);
    emaSeries.setData([q]);
  }
  else
  {
    var lastData = structuredClone(mainSeries.data().at(-1));
    if(nTVtime(q.ltt) > lastData.time + 5 * 60)
    {
      lastData = q;
      lastData.time = nTVtime(q.ltt);
      lastData.m = (2/21) * q.close + lastData.value;
    }
    else
    {
      lastData.close = q.close;
      lastData.high = Math.max(lastData.high, q.high);
      lastData.low = Math.min(lastData.low, q.low);
      lastData.value = (2/21) * q.close + (1-2/21) * lastData.m;
    }
    mainSeries.update(lastData);
    emaSeries.update(lastData);
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