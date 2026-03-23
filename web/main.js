let positions = new Array(0);
let optionChains = new Array(0);
let ordercounter = 1;

function emit(event, args) {

  socket.emit(event, args);
}

function loadPreData()
{
  var ls = new Date(instrument.simStartTime);
  var le = ls.getTime() - 1000; 
  var newDate = ls.getDate()-1;
  if (ls.getDay() === 1) //Monday
    newDate = newDate - 2;
  ls.setDate(newDate); ls.setHours(9); ls.setMinutes(15);

  const p = {
    uid: uuid,
    mode: mode,
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
  emit('speed', Number(selectBoxValue));
}

function resumeSimulation()
{
  emit('restored', {continue: true});
}

function start()
{
  mode = document.getElementById("modeselect").value;

  emit('startstream', instrument); 
  if (OptionChain.get(instrument.oExpiry) === undefined)
    optionChains.push(new OptionChain(instrument.oExpiry, 'ocBody'));
}

function stopSimulation() 
{
  emit('stop', 'user action');
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
    optionChains.push(new OptionChain(instrument.oExpiryNxt), 'ocBody2');
  
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

function enterPosition(event) 
{
  let btn = event.target;

  var action = btn.id.startsWith('buy') ? 'BUY' : 'SELL';
  var right = btn.id.endsWith('CE') ? 'Call' : 'Put';

  let row = btn.parentNode.parentNode.parentNode;
  let colStrikePrice = right === 'Call' ? 3 : 4;
  let symbol = row.cells[colStrikePrice].childNodes[6].innerText;
  let lot = document.getElementById("lotselect").value;
  let lmtprice = document.getElementById('lmtprice').value;
  
  var p = Position.findPositionRow(symbol);
  if(p === undefined)
    p = new Position(symbol);

  p.order(action, lot, lmtprice);
}

function exitPosition(event) 
{
  let row = event.target.parentNode.parentNode.parentNode;

  var p = Position.findPositionRow(row.title);
  p.exit();
}

function wsconnect(action){
  var tpt = document.getElementById("tpt").value;
  emit('ws', {action: action, tpt: tpt});
}

document.getElementById("tabButton1").childNodes[1].innerText = instrument.oExpiry;
document.getElementById("tabButton2").childNodes[1].innerText = instrument.oExpiryNxt;