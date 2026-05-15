let optionsChartConfig = new Array(0);

function convertDate(es)
{
  const shortDateFormat = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
  });
  return shortDateFormat.format(new Date(es));
}

function setQDeltaStrikesCharts(ceStrike, peStrike, oExpiry)
{
  var attributePE = {
    expiry: oExpiry,
    strikep: peStrike,
    right: 'Put',
    source: 'chart',
  };
  var chartConfigItem = {
    lineRef: peSeries, 
    attributeSet: [attributePE],
    visible: true,
    type: 'instrument',
    tick: {time: 0, prices: [0],},
  };
  optionsChartConfig.push(chartConfigItem);
  
  var attributeCE = {
    expiry: oExpiry,
    strikep: ceStrike,
    right: 'Call',
    source: 'chart',
  };
  chartConfigItem = {
    lineRef: ceSeries, 
    attributeSet: [attributeCE],
    visible: true,
    type: 'instrument',
    tick: {time: 0, prices: [0],},
  };
  optionsChartConfig.push(chartConfigItem);

  chartConfigItem = {
    lineRef: stratSeries, 
    attributeSet: [attributePE, attributeCE],
    visible: true,
    type: 'strategy', 
    tick: {time: 0, prices: [0,0],},
    } ;
  optionsChartConfig.push(chartConfigItem);
}

function expandSymbol(symbol)
{
    const regex = /[0-9]/;
    const idx = symbol.search(regex);
    const s = {};
    s.stockCode = idx === -1 ? symbol : symbol.slice(0, idx);

    s.right = symbol.slice(-2) === 'CE' ? 'Call' : 'Put';
    s.expiry_date = symbol.slice(idx, idx + 7);
    s.strike_price = symbol.slice(idx + 7, -2);

    return s;
}

function generateEvent(type, nv)
{
  return new CustomEvent(type, {

    detail: nv,
    bubbles: true,   // Allow the event to bubble up the DOM
    cancelable: true // Allow event.preventDefault()
  });
}

function qSel(element, name, type){
  type = type === 'id' ? '#' : type === 'css' ? '.' : '';
  return element.querySelector(type + name);
}