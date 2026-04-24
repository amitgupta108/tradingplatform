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

function symtoinstrument(symbol)
{
  var stk = symbol.slice(-9, -2);
  var digit5 = Number.isFinite(Number(stk));
  var strike = digit5 ? stk.slice(2, 7) : stk.slice(3, 7);
  var expiry = digit5 ? symbol.slice(-14, -7) : symbol.slice(-13, -6);
  var stockCode = digit5 ? symbol.slice(0, -14) : symbol.slice(0, -13);

  var instrument = {
    stockCode: stockCode,
    expiry: expiry,
    strike: strike,
    right: symbol.slice(-2),
    name: expiry + ' ' + strike + ' ' + symbol.slice(-2)
  };

  return instrument;
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

function tRow(template, withListener){
  const new_row = document.importNode(template.content, true).querySelector('tr');
  if(withListener){
    new_row.addEventListener('click', (e) => {
      handleRowEvent(e)}, true);
  }
  return new_row;
}

function handleRowEvent(e)
{
  const clickedElement = e.target;
  const limitp = qSel(e.currentTarget, 'lmtprice', 'id');

  if(clickedElement.innerText === 'MARKET'){
    clickedElement.innerText = 'LIMIT';
    limitp.disabled = false;
  }
  else if(clickedElement.innerText === 'LIMIT')
  {
    clickedElement.innerText = 'MARKET';
    limitp.value = "";
    limitp.disabled = true;
  }
}