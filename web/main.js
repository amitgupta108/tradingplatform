
function emit(event, arg1, arg2) {
  socket.emit(event, arg1, arg2);
}

function loadPreData()
{
  var ls = instrument.mode === 0 ? new Date(instrument.simStartTime) : new Date();
  var le = ls.getTime() - 1000; 
  var newDate = ls.getDate()-1;
  if (ls.getDay() === 1) //Monday
    newDate = newDate - 2;
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
  emit('exit', 'user action');
}

function listOrders()
{
  emit('positionbook', {stockCode: instrument.stockCode});
}

function switchTabs(evt, container, tabName) {
  var i, tabcontent, tablinks;
  var tabcontainer = document.getElementById(container);
  var tabcontent = tabcontainer.querySelectorAll('.tab-content');
  for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
  }
  tablinks = tabcontainer.querySelectorAll('.tab');
  for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[0].className.replace(" active-tab", "");
  }
  document.getElementById(tabName).style.display = "block";  
  evt.currentTarget.className += " active-tab";
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

  var timer = action === 'connect' ? timer(action, 60000, true) : timer(action, 60000, false);
}

function listPositions(ps)
{
  emit('positionbook', instrument.stockCode);
}

document.getElementById("tabButton1").childNodes[1].innerText = instrument.oExpiry;
document.getElementById("tabButton2").childNodes[1].innerText = instrument.oExpiryNxt;