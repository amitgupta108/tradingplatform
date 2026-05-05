function emit(event, arg1, arg2) {
  socket.emit(event, arg1, arg2);
}

function loadPreData(endtime)
{
  const last_working_date = 3;
  var ls = instrument.mode === 0 ? new Date(instrument.simStartTime) : new Date();
  var le = endtime === undefined ? ls.getTime() - 1000 : endtime; 
  var newDate = ls.getDate() - (last_working_date === 0 ? 1 : last_working_date);
  var yesterdayoff = true;
  var holiday = ls.getDay() === 1 ? 2 : yesterdayoff ? 1 : 0;
  newDate = newDate - holiday;
  ls.setDate(newDate); ls.setHours(9); ls.setMinutes(15);

  const p = {
    fExpiry: instrument.fExpiry,
    startTime: ls.getTime(),
    endTime: le,
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

function stopSimulation() 
{
  emit('stop', 'user action');
}

function exit() 
{
  socket.disconnect();
}

function listOrders()
{
  emit('orderbook', {stockCode: instrument.stockCode});
}
  
function streamOptionChain(event)
{  
  var oc_key = expiry_label === instrument.oExpiry ? 'occrnt' : 'ocnxt';
  emit(oc_key, 'toggle');
}

function wsconnect(action){
  const tpt = document.getElementById("tpt").value;
  if(tpt.length === 15)
    action = 'live';
  
  emit('wsOps', {action: action, data: tpt});
  document.getElementById("tpt").value = "";
}