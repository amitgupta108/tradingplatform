function orderWindow(clBtn, parent)
{
  let symbol = parent.title;
  const action = clBtn.innerText;

  appendOrderRow(new Order(symbol, action), toggle.checked);
  showOrderWindow();
}

function appendOrderRow(neworder, isBasket)
{
  toggle.disabled = true;    
  var scripName = symtoinstrument(neworder.symbol).name;

  var tr = tRow(t_order_window_row, true);
  tr.querySelector('#owsymbol').innerText  = neworder.symbol;
  tr.querySelector('#scripName').innerText  = scripName;
  tr.querySelector('#lotselect').value = neworder.quantity / instrument.lotsize;
  tr.querySelector('#ordertype').innerText = neworder.pricetype;
  
  const order_row_btn = tr.querySelector('#ow_action_btn');
  order_row_btn.innerText = neworder.action;

  neworder.action === 'B' ? 
      order_row_btn.classList.replace('sell', 'buy') :
      order_row_btn.classList.replace('buy', 'sell') ;

  if(!isBasket) {
    order_rows_tbody.innerHTML = '';
    tr.classList.remove('hover-row');
  }
  order_rows_tbody.prepend(tr); 
}

function showOrderWindow()
{
  var rows = oWindow.querySelectorAll('tr');
  oWindow.classList.remove('multi');
  oWindow.classList.remove('buy');
  oWindow.classList.remove('sell');
  
  var wCSS = rows.length > 2 ? 'multi' : rows[0].querySelector("#ow_action_btn").innerText === 'B' ? 'buy' : 'sell';
  oWindow.classList.add(wCSS);
  oWindow.style.display = "block";

  setTimeout(() => {
      oWindow.classList.add('show');
    }, 10);
}

function flipAction(orderRowBtn, orderRow)
{
  var action = orderRowBtn.innerText;
  orderRowBtn.innerText = action === 'B' ? 'S' : 'B';
  if(action === 'B')
    orderRowBtn.classList.replace('buy', 'sell');
  else
    orderRowBtn.classList.replace('sell', 'buy');
  
  showOrderWindow();
}

function switchTabs(evt) {
  document.getElementById('tabButton1').classList.toggle('active-tab');
  document.getElementById('tabButton3').classList.toggle('active-tab');

  document.getElementById('c_oc_div').classList.toggle('active');
  document.getElementById('n_oc_div').classList.toggle('active');
}

function writeProfitLoss()
{  
  let bookedPL = 0; let unbookedPL = 0;

  for (let i = 0; i < positions.length ; i++)
  {
    bookedPL += Number(positions[i].value('bookedPL'));
    unbookedPL += Number(positions[i].value('unbookedPL')); 
  }

  total_booked = bookedPL.toFixed(2);
  total_unbooked = unbookedPL.toFixed(2);
  total_pnl = (bookedPL + unbookedPL).toFixed(2);
}

function tRow(template, withListener){
  const new_row = document.importNode(template.content, true).querySelector('tr');
  if(withListener){
    new_row.addEventListener('click', (e) => {
      e.stopPropagation();
      if(e.target !== new_row)
        handleRowEvent(e);
    }, true);
  }
  return new_row;
}

function handleRowEvent(e)
{
  const cl_el = e.target;
  const pn_el = e.currentTarget;

  if(cl_el.id === 'ordertype')
    flipOrderType(cl_el, pn_el);
  else if(cl_el.id === 'div_trans_btn')
    orderWindow(cl_el, pn_el);
  else if(cl_el.id === 'row_attn_btn')
    hl_row(cl_el, pn_el);
  else if(cl_el.id === 'ow_action_btn')
    flipAction(cl_el, pn_el);
  else if(cl_el.id === 'ow_row_rm_btn')
    removeOrderRow(cl_el, pn_el);
  else if(cl_el.id === 'orderdisplay-btn')
    displayOrderList(cl_el, pn_el);
  else if(cl_el.id === 'cancel_order_btn')
    cancelOrder(cl_el, pn_el);
  else if(cl_el.id === 'conf_cancel_lb')
    confirmCancel(cl_el, pn_el);
  else if(cl_el.id === 'drop_cancel_btn')
    dropCancelOrder(cl_el, pn_el);
}

function flipOrderType(c, p)
{
  c.innerText = c.innerText === 'MARKET' ? 'LIMIT' : 'MARKET';
  const limitp = qSel(p, 'lmtprice', 'id');
  limitp.disabled = c.innerText === 'MARKET' ? true: false;
  if(c.innerText === 'MARKET') 
    limitp.value = "";
}

function hl_row(c, p)
{
  const symbol = p.title;
  const oc = OptionChain.get(symtoinstrument(symbol).expiry);
  var idx = oc.hl_symbol.findIndex((r) => p.title === r);
  if(idx === -1)
    oc.hl_symbol.push(p.title);
  else
    oc.hl_symbol.splice(idx, 1);
}

function removeOrderRow(c, p){
  p.remove();
}

function cancelOrder(c, p)
{
  const symbol = order_list_thead.rows[0].title;
  const postn = Position.findPosition(symbol, false);
  const orderid = Number(p.title);
  const c_order = postn.finalorders.find((o) => o.orderid === orderid);
  if(c_order !== undefined && c_order.state === 'opened')
    emit('cancelorder', c_order);
  
  orderlistDiv.style.display = 'none';
  sOrderSubmit.play();
}

function confirmCancel(c, p) {
  var overlay = c.nextElementSibling;
  overlay.style.display = 'flex';
}

function dropCancelOrder(c, p)
{
  p.style.display = 'none';
}