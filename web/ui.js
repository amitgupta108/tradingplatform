function prepareOrderWindow(clickedBtn)
{
  let symbol = clickedBtn.parentNode.parentNode.nextElementSibling.innerText;
  let action = clickedBtn.innerText;

  toggle.disabled = true;    
  var isMultiple = toggle.checked;

  var tr = createOrderRow(new Order(symbol, action));
  appendOrderRow(tr, isMultiple)
  showOrderWindow();
}

function createOrderRow(order)
{
  var scripName = symtoinstrument(order.symbol).name;

  var tr = document.importNode(order_window_row_template.content, true).querySelector('tr');
  tr.querySelector('#owsymbol').innerText  = order.symbol;
  tr.querySelector('#scripName').innerText  = scripName;
  tr.querySelector('#lmtprice').innerText  = "";
  if(order.quantity != undefined)
    tr.querySelector('#lotselect').value = order.quantity / instrument.lotsize;
  if(order.pricetype !== undefined)
    tr.querySelector('#ordertype').innerText = order.pricetype;

  const rowBtn = tr.querySelector("#owaction");
  rowBtn.innerText = order.action;
  if(order.action === 'B')
    rowBtn.classList.replace('sell', 'buy');
  else 
    rowBtn.classList.replace('buy', 'sell');

  return tr;
}

function appendOrderRow(tr, isMultiple)
{
  var tBody = document.getElementById('tbody-order-panel');  

  if(!isMultiple) {
    tBody.innerHTML = '';
    tr.classList.remove('hover-row');
  }
  tBody.prepend(tr); 
}

function showOrderWindow()
{
  toggle.disabled = true;
  var rows = oWindow.querySelectorAll('tr');
  oWindow.classList.remove('multi');
  oWindow.classList.remove('buy');
  oWindow.classList.remove('sell');
  
  var wCSS = rows.length > 2 ? 'multi' : rows[0].querySelector("#owaction").innerText === 'B' ? 'buy' : 'sell';
  oWindow.classList.add(wCSS);
  oWindow.style.display = "block";

  setTimeout(() => {
      oWindow.classList.add('show');
      qBox.addEventListener('strikex', orderPanelQuote);
    }, 10);
}

function removeOrderRow(target){
  target.parentNode.parentNode.parentNode.remove();
}

function orderPanelQuote(event)
{
  const tBody = document.getElementById('tbody-order-panel');
  var rows = tBody.rows;

  for(var i = 0; i < rows.length; i++)
  {
    if(event.detail.symbol === rows[i].querySelector("#owsymbol").innerText)
      rows[i].querySelector("#owprice").innerText = event.detail.close.toFixed(2);
  }
}

function flipAction(orderRowBtn)
{
  var action = orderRowBtn.innerText;
  orderRowBtn.innerText = action === 'B' ? 'S' : 'B';
  if(action === 'B')
    orderRowBtn.classList.replace('buy', 'sell');
  else
    orderRowBtn.classList.replace('sell', 'buy'); 
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

function changeText(self) {
  self.innerText = self.innerText === 'MARKET' ? 'LIMIT' : 'MARKET';
}

function writeProfitLoss()
{  
  let bookedPL = 0; let unbookedPL = 0;

  for (let i = 0; i < positions.length ; i++)
  {
    bookedPL += Number(positions[i].value('bookedPL'));
    unbookedPL += Number(positions[i].value('unbookedPL')); 
  }

  document.getElementById("vBookedPL").innerText = bookedPL.toFixed(2);
  document.getElementById("vUnbookedPL").innerText = unbookedPL.toFixed(2);
  document.getElementById("vTotalPL").innerText = (bookedPL + unbookedPL).toFixed(2);
}

function displayOrderList(btn, event)
{
  const symbol = btn.parentNode.parentNode.title;
  const p = Position.findPositionRow(symbol);
  orderlistDiv.querySelector('td').innerText = symtoinstrument(symbol).name;

  const row = document.getElementById('order-list-tr');  
  orderlistDiv.querySelector('#order-list-tbody').innerHTML = "";
  
  var tqty = 0;
  p.finalorders.forEach((o, idx) => {
    var clone = document.importNode(row.content, true);
    var newtr = clone.querySelector('tr');

    newtr.title = symbol;
    var qty = o.state.startsWith('complete') ? o.filled_q : 0;
    tqty = tqty + Number(qty * (o.action === 'BUY' ? 1 : -1));

    newtr.childNodes[1].innerText = o.orderid;
    newtr.childNodes[3].innerText = o.action.slice(0, 1);
    newtr.childNodes[5].innerText = qty;
    newtr.childNodes[7].innerText = o.pricetype.slice(0, 1);
    newtr.childNodes[9].innerText = tqty;
    newtr.childNodes[11].innerText = (o.state === 'opened' ? o.price : o.state === 'cancelled' ? 0 : o.pricedAt).toFixed(2);
    newtr.childNodes[13].innerText = o.state;
    newtr.childNodes[15].childNodes[1].innerText = (o.state === 'opened' ? 'x' : '');
    if(o.state === 'opened') 
      newtr.childNodes[15].childNodes[1].classList.add('clickable');
          
    document.querySelector('#order-list-tbody').append(newtr);
  });
  orderlistDiv.style.display = 'flex';
}

function confirmcancel(target) {
  var overlay = target.nextElementSibling;
  overlay.style.display = 'flex';
}

function exitCBEvent()
{
  const checkboxes = document.querySelectorAll('#exitcb');
  const checkedIndexes = Array.from(checkboxes)
  .map((cb, i) => cb.checked ? i : null)
  .filter(val => val !== null);

  const hasSelection = checkedIndexes.length > 0;
  exitPositionBtn.style.display = hasSelection ? 'block' : 'none';
  countSpan.textContent = checkedIndexes.length;
  exitAll.checked = checkedIndexes.length === checkboxes.length;
}

document.getElementById("tabButton1").childNodes[1].innerText = instrument.oExpiry;
document.getElementById("tabButton3").childNodes[1].innerText = instrument.oExpiryNxt;