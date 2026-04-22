function emit(event, arg1, arg2) {
  socket.emit(event, arg1, arg2);
}

function loadPreData(endtime)
{
  var ls = instrument.mode === 0 ? new Date(instrument.simStartTime) : new Date();
  var le = endtime === undefined ? ls.getTime() - 1000 : endtime; 
  var newDate = ls.getDate()-1;
  var yesterdayoff = true;
  var holiday = ls.getDay() === 1 ? 2 : yesterdayoff ? 1 : 0;
  newDate = newDate - holiday;
  ls.setDate(newDate); ls.setHours(9); ls.setMinutes(15);

  const p = {
    uid: instrument.uid,
    stockCode: instrument.stockCode,
    fExpiry: instrument.fExpiry,
    oExpiry: instrument.oExpiry,
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

function resumeSimulation()
{
  if(mainSeries.data().length === 0)
    loadPreData(socket.sTime);

  if (OptionChain.get(instrument.oExpiry) === undefined)
    new OptionChain(instrument.oExpiry, 'ocBody');
  emit('resume', {continue: true});

}

function start()
{
  loadPreData();
  emit('startstream', instrument); 
  if (OptionChain.get(instrument.oExpiry) === undefined)
    new OptionChain(instrument.oExpiry, 'ocBody');
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
  
function runOptionChainNxt(event)
{
  if (OptionChain.get(instrument.oExpiryNxt) === undefined)
    new OptionChain(instrument.oExpiryNxt, 'ocBody2');
  
  if (event.currentTarget.innerText === '>') {
    emit('ocnxt', 'start');
    event.currentTarget.innerText = '| |';
  }
  else if (event.currentTarget.innerText === '| |')
  {
    emit('ocnxt', 'stop');
    event.currentTarget.innerText = '>';
  }
}

function wsconnect(action){
  var tpt = document.getElementById("tpt").value;
  emit('wsOps', {action: action, data: tpt});
  document.getElementById("tpt").value = "";
}