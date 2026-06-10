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
    exchange: instrument.exc,
    stockCode: instrument.stockCode,
    fExpiry: instrument.fExpiry,
    startTime: startTime,
    endTime: endTime - 1000,
    interval: '5minute',
    keys: keys
  }
  emit('preData', p);
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
  emit('stop', 'user action');
}

function exit() 
{
  socket.disconnect();
}

function listOrders()
{
  emit('orderbook', instrument.stockCode);
}
  
function streamOptionChain(event)
{  
  event.stopPropagation();
  var oc_key = expiry_label.innerText === instrument.oExpiry ? 'occrnt' : 'ocnxt';
  emit('option_chain', {key: oc_key, action:'toggle'});
}

function wsconnect(action){
  const tpt = document.getElementById("tpt").value;
  if(tpt.length === 15)
    action = 'unlock_live';
  
  emit('wsOps', {action: action, data: tpt});
  document.getElementById("tpt").value = "";
}

function subs_vix()
{
  emit('vix', {action: 'subs'});
}