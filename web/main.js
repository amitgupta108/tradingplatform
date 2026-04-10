
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
    uid: instrument.uuid,
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

function listPositions()
{
  emit('positionbook', {stockCode: instrument.stockCode});
}

function listOrders()
{
  emit('positionbook', {stockCode: instrument.stockCode});
}

function switchChart(evt, tabClicked, tabOther) 
{
  var i, tab, tablinks;

  tab = document.getElementById(tabClicked);
  tab.className = "chart-show";
  tab = document.getElementById(tabOther);
  tab.className = "chart-hide";
  
  tablinks = document.getElementsByClassName("tab2");
  for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active-tab", "");
  }
  evt.currentTarget.className += " active-tab";
}
  
function switchExpiry(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tab-content");
  for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tab");
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

function savePositions(){
  var p = new Array(0);
  positions.forEach((e) => {
    p.push({symbol: p.symbol, orderN: p.orderN, orders: p.orders})
 });

 emit('positions', p);
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