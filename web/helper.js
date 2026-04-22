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

function addPositionRow(symbol) {

  var template = document.importNode(position_table_row_template.content, true);
  var positionrow = template.querySelector('tr');
  positionrow.title = symbol;
  template.querySelector('#orderdisplay-btn').title = symbol;
  document.getElementById('tblBody').append(positionrow);
  
  return positionrow;
}

function createOCTable(oTblBody, nStrikes)
{
  const tblBody = document.getElementById(oTblBody);
  var rows = tblBody.getElementsByTagName('tr');
  
  var template = rows[rows.length -1].cloneNode(true);
  oTblBody.innerHTML = '';
    
  while(rows.length <= nStrikes)
  {
    var clone = template.cloneNode(true);
    oTblBody.append(clone);
  }
  return oTblBody.getElementsByTagName('tr');
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
