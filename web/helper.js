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

function addRow(symbol) {
  const tblBody = document.getElementById("tblBody");
  var row = tblBody.getElementsByTagName('tr')[0];
  row.cells[8].childNodes[1].childNodes[1].style.pointerEvents = 'auto';
  row.cells[8].childNodes[1].childNodes[1].style.opacity = '1';

  var clone = row.cloneNode(true);
  clone.title = symbol;
  tblBody.appendChild(clone);
  return clone;
}

function createOCTable(oTblBody, nStrikes)
{
  var rows = oTblBody.getElementsByTagName('tr');
  
  var template = rows[rows.length -1].cloneNode(true);
  oTblBody.innerHTML = '';
    
  while(rows.length <= nStrikes)
  {
    var clone = template.cloneNode(true);
    oTblBody.append(clone);
  }
  return oTblBody.getElementsByTagName('tr');
}