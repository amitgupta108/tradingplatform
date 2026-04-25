function prepareOrderWindow(event)
{
  toggle.disabled = true;    

  let symbol = event.currentTarget.title;
  let clickedBtn = event.target;
  const action = clickedBtn.innerText;

  const neworder = new Order(symbol, action);
  var scripName = symtoinstrument(neworder.symbol).name;

  var tr = tRow(t_order_window_row, true);
  tr.querySelector('#owsymbol').innerText  = neworder.symbol;
  tr.querySelector('#scripName').innerText  = scripName;
  tr.querySelector('#lotselect').value = neworder.quantity;
  tr.querySelector('#ordertype').innerText = neworder.pricetype;
  
  const order_row_btn = tr.querySelector('#owaction');
  order_row_btn.innerText = neworder.action;

  neworder.action === 'B' ? 
      order_row_btn.classList.replace('sell', 'buy') :
      order_row_btn.classList.replace('buy', 'sell') ;

  if(!toggle.checked) {
    order_rows_tbody.innerHTML = '';
    tr.classList.remove('hover-row');
  }
  order_rows_tbody.prepend(tr); 
  showOrderWindow();
}

function showOrderWindow()
{
  var rows = oWindow.querySelectorAll('tr');
  oWindow.classList.remove('multi');
  oWindow.classList.remove('buy');
  oWindow.classList.remove('sell');
  
  var wCSS = rows.length > 2 ? 'multi' : rows[0].querySelector("#owaction").innerText === 'B' ? 'buy' : 'sell';
  oWindow.classList.add(wCSS);
  oWindow.style.display = "block";

  setTimeout(() => {
      oWindow.classList.add('show');
    }, 10);
}

function removeOrderRow(target){
  target.parentNode.parentNode.parentNode.remove();
}

function flipAction(orderRowBtn)
{
  var action = orderRowBtn.innerText;
  orderRowBtn.innerText = action === 'B' ? 'S' : 'B';
  if(action === 'B')
    orderRowBtn.classList.replace('buy', 'sell');
  else
    orderRowBtn.classList.replace('sell', 'buy');
  
  showOrderWindow();
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
  const p = Position.findPosition(symbol, false);
  orderlistDiv.querySelector('td').innerText = symtoinstrument(symbol).name;

  orderlistDiv.querySelector('#order-list-tbody').innerHTML = "";
  
  var tqty = 0;
  p.finalorders.forEach((o, idx) => {
    var newtr = tRow(t_order_list_row);

    newtr.title = symbol;
    var qty = o.state.startsWith('complete') ? o.filled_q : 0;
    tqty = tqty + Number(qty * (o.action === 'BUY' ? 1 : -1));

    newtr.childNodes[1].innerText = o.orderid;
    newtr.childNodes[3].innerText = o.action.slice(0, 1);
    newtr.childNodes[5].innerText = qty;
    newtr.childNodes[7].innerText = o.pricetype.slice(0, 1);
    newtr.childNodes[9].innerText = tqty;
    newtr.childNodes[11].innerText = (o.state === 'opened' ? o.price : o.state === 'cancelled' ? 0 : o.pricedAt);
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
  const checkboxes = document.querySelectorAll('#exit_checkbox');
  const checkedIdx = Array.from(checkboxes)
  .map((cb, i) => cb.checked ? i : null)
  .filter(val => val !== null);

  exitPositionBtn.style.display = checkedIdx.length > 0 ? 'block' : 'none';
  exitAll.checked = checkedIdx.length === checkboxes.length;
}

document.getElementById("tabButton1").childNodes[1].innerText = instrument.oExpiry;
document.getElementById("tabButton3").childNodes[1].innerText = instrument.oExpiryNxt;