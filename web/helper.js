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
      e.stopPropagation();
      if(e.target !== new_row)
        handleRowEvent(e);
    }, true);
  }
  return new_row;
}

function handleRowEvent(e)
{
  const clickedElement = e.target;
  const parentElement = e.currentTarget;

  if(clickedElement.id === 'ordertype')
    flipOrderType(clickedElement, parentElement);
  else if(clickedElement.id === 'div_trans_btn')
    orderWindow(e);
  else if(clickedElement.id === 'row_attn_btn')
    hl_row(clickedElement, parentElement);
  else if(clickedElement.id === 'ow_action_btn')
    flipAction(clickedElement, parentElement);
  else if(clickedElement.id === 'ow_row_rm_btn')
    removeOrderRow(clickedElement, parentElement);
  else if(clickedElement.id === 'orderdisplay-btn')
    displayOrderList(clickedElement, parentElement);
}

function flipOrderType(c, p)
{
  c.innerText = c.innerText === 'MARKET' ? 'LIMIT' : 'MARKET';
  const limitp = qSel(p, 'lmtprice', 'id');
  limitp.disabled === c.innerText === 'MARKET' ? false: true;
  if(c.innerText === 'LIMIT') 
    limitp.value = "";
}

function hl_row(c, p)
{
  const symbol = p.title;
  const oc = OptionChain.get(symtoinstrument(symbol).expiry);
  var idx = oc.hl_symbol.findIndex((r) => p.title === r);
  if(idx === -1)
    oc.hl_symbol.push(p.title);
  else
    oc.hl_symbol.splice(idx, 1);
}

function removeOrderRow(c, p){
  p.remove();
}