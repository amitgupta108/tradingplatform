function emit(event, arg1, arg2) {
  socket.emit(event, arg1, arg2);
}

function historyParams(expiry)
{
  const endTime = instrument.simStartTime ?? Date.now();
  const startTime = endTime - 3 * 24 * 60 * 60 * 1000; // 3 days back

  const p = {
    exchange: instrument.exchange,
    stockCode: instrument.stockCode,
    startTime: startTime,
    endTime: endTime - 1000,
    interval: '5minute'
  }
  p[expiry] = expiry === 'fExpiry'? instrument[expiry] : instrument['oExpiries'][0];
  return p;
}

function loadPreData()
{
  const keys = ['futures', 'index', 'vix'];

  const requests = new Array();
  keys.forEach((k) => {
    const p = historyParams('fExpiry');
    p.key = k;
    requests.push(p);
  });
  emit('history', requests);
}

function changeSpeed()
{
  var selectBoxValue = document.getElementById("optionSpeed").value;
  emit('speed', selectBoxValue);
}

function start()
{
  loadPreData();
  emit('startv2', instrument); 
}

function stop() 
{
  if(document.getElementById('btnStopSim').innerText === 'Stop')
    emit('stream', 'pause');
  else if (document.getElementById('btnStopSim').innerText === 'Resume')
    emit('stream', 'resume');
}

function exit() 
{
  //socket.disconnect();
  //bottom_btns.forEach((btn) => btn.disabled = true);
  emit('exit', 'pause');
}

function listOrders()
{
  emit('orderbook', instrument.stockCode);
}
  
function streamOptionChain(event)
{  
  event.stopPropagation();
  const idx = document.getElementById('expiry_btn_1').disabled ? 0 : 1;
  emit('option_chain', {expiry: instrument.oExpiries[idx], action:'toggle'});
}

function wsOps(action)
{
  emit('wsOps', action, tpt);
}

function subs_vix()
{
  //emit('vix', {action: 'subs'});
  emit('positions', instrument.stockCode);
}

function reload()
{
  emit('reload', '');
}

function auth(action)
{
  const provider = document.getElementById("tpt").value;
  emit('authenticate', provider);
  document.getElementById("tpt").value = "";
}

function showChart() {
  switchCharts(1);
  const rows = oc_container.querySelectorAll('tr.row_background');
  if (rows.length === 0)
    return;
  const symbols = Array.from(rows).map((r) => r.title);
  ChartEventer.run(symbols);
  options_chart.show(symbols, true);
}