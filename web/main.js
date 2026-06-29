function emit(event, arg1, arg2) {
  socket.emit(event, arg1, arg2);
}

function loadPreData()
{
  const endTime = instrument.simStartTime;
  const startTime = endTime - (simDate.getDay() === 1 ? 3 : 2) * 24 * 60 * 60 * 1000; // 2 days back
  const keys = ['futures', 'index', 'vix'];

  const p = {
    appid: instrument.appid,
    exchange: instrument.exchange,
    stockCode: instrument.stockCode,
    fExpiry: instrument.fExpiry,
    startTime: startTime,
    endTime: endTime - 1000,
    interval: '5minute'
  }

  keys.forEach((k) => {
    p.key = k;
    emit('history', p);
  });
}

function changeSpeed()
{
  var selectBoxValue = document.getElementById("optionSpeed").value;
  emit('speed', selectBoxValue);
}

function start()
{
  loadPreData();
  emit('start', instrument); 
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
  var oc_key = expiry_btn_1.disabled === false ? 'occrnt' : 'ocnxt';
  emit('option_chain', {key: oc_key, action:'toggle'});
}

function wsOps(action){
  const tpt = document.getElementById("tpt").value;
  const eventName = tpt.length === 15 ? 'live_trading' : 'wsOps';
  emit(eventName, action, tpt);
  document.getElementById("tpt").value = "";
}

function subs_vix()
{
  emit('vix', {action: 'subs'});
}

function reload()
{
  emit('reload', '');
}