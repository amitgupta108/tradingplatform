function orderWindow(clBtn, parent)
{
  const symbol = parent.title;
  const action = clBtn.innerText;

  appendOrderRow(new Order(symbol, action), toggle.checked);
  showOrderWindow();
}

function appendOrderRow(neworder, isBasket)
{
  toggle.disabled = true;    
  const scripName = expandSymbol(neworder.symbol).name;

  var tr = tRow(t_order_window_row);
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
  oWindow.classList.remove('multi', 'buy', 'sell');
  
  var wCSS = rows.length > 2 ? 'multi' : rows[0].querySelector("#ow_action_btn").innerText === 'B' ? 'buy' : 'sell';
  oWindow.classList.add(wCSS);
  oWindow.style.display = "block";
  oWindow.classList.add('show');
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

function switchTabs(evt) 
{  
  expiry_label.innerText = expiry_label.innerText === instrument.oExpiry ? instrument.oExpiryNxt : instrument.oExpiry;
  document.getElementById('c_oc_div').classList.toggle('active');
  document.getElementById('n_oc_div').classList.toggle('active');
}

function tRow(template, withListener = true){
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
  const oc = OptionChain.get(expandSymbol(symbol).expiry_date);
  var idx = oc.hl_symbol.findIndex((r) => p.title === r);
  if(idx === -1)
    oc.hl_symbol.push(p.title);
  else
    oc.hl_symbol.splice(idx, 1);
}

function removeOrderRow(c, p){
  p.remove();
}

function cancelOrder(c, p_row)
{
  emit('cancelorder', {orderid: p_row.title});
  sOrderSubmit.play();
  orderlistDiv.style.display = 'none';
}

function confirmCancel(c, p) {
  var overlay = c.nextElementSibling;
  overlay.style.display = 'flex';
}

function dropCancelOrder(c, p)
{
  c.parentElement.style.display = 'none';
}