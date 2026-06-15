function createOrder(btn, parent)
{
  const symbol = parent.title;
  const action = btn.innerText;
  
  const rows = order_rows_tbody.rows;

  if(rows.length === 0)
    appendOrderRow(symbol, action);
  else if(rows.length > 0)
  {
    var idx = Array.from(rows).findIndex((r) => {
      return r.querySelector('#owsymbol').textContent === symbol;
    });
    const r_row = !basket.checked ? 0 : idx;
    if(r_row !== -1)
      rows[r_row].remove();
    
    appendOrderRow(symbol, action);
  }
  showOrderWindow();
}

function appendOrderRow(symbol, action, quantity = 1)
{
  const scripName = expandSymbol(symbol).name;

  var tr = tRow(t_order_window_row);
  tr.querySelector('#owsymbol').textContent  = symbol;
  tr.querySelector('#scripName').textContent  = scripName;
  tr.querySelector('select').value = quantity;

  const action_btn = tr.querySelector('#ow_action_btn');
  action_btn.textContent = action;

  if(!basket.checked)
    tr.classList.remove('hover-row');

  if(action === 'B') {
    action_btn.classList.replace('sell', 'buy');
  } else {
    action_btn.classList.replace('buy', 'sell');
  }

  order_rows_tbody.prepend(tr);
  submitOWinBtn.disabled = true;
}

function showOrderWindow()
{  
  basket.disabled = true;
  const rows = order_rows_tbody.rows;
  if(rows.length > 1)
  {
    if(!oWindow.classList.contains('multi'))
    {
      oWindow.classList.remove('buy', 'sell');
      oWindow.classList.add('multi');
    }
  }
  else if(rows.length  === 1)
  {
    const action = rows[0].querySelector('#ow_action_btn').innerText;
    oWindow.classList.remove('buy', 'sell');
    if(action === 'B') 
      oWindow.classList.add('buy');
    else
      oWindow.classList.add('sell');
  }
  if(oWindow.style.display !== "block")
    oWindow.style.display = "block";
}

function hideOWin()
{
  oWindow.style.display = "none";
  order_rows_tbody.innerHTML = "";
  basket.disabled = false;
  submitOWinBtn.disabled = true;
  in_prep_orders.orders = {};
}

function flipAction(orderRowBtn, orderRow)
{
  submitOWinBtn.disabled = true;
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
  expiry_label.textContent = expiry_label.textContent === instrument.oExpiry ? instrument.oExpiryNxt : instrument.oExpiry;
  document.getElementById('c_oc_div').classList.toggle('active');
  document.getElementById('n_oc_div').classList.toggle('active');
}

function tRow(template, withListener = true){
  const new_row = document.importNode(template.content, true).querySelector('tr');
  if(withListener){
    new_row.addEventListener('click', (e) => {
      e.stopPropagation();

      if(e.target !== new_row)
        handleClickEvent(e);
    }, true);

    new_row.addEventListener('change', (e) => {
      e.stopPropagation();

      if(e.target !== new_row)
        handleChangeEvent(e);
    }, true);

    new_row.addEventListener('input', (e) => {
      e.stopPropagation();
      
      if(e.target.id === 'lmtprice' && e.target !== new_row)
      submitOWinBtn.disabled = true;
    }, true);
    return new_row;
  }
}

function handleChangeEvent(e)
{
  const clicked = e.target;
  const parent = e.currentTarget;

  if(parent.id === 'order-window-tr')
    submitOWinBtn.disabled = true;
  else if(clicked.id === 'pos_exit_cb')
    position_cb_action();
}

function handleClickEvent(e)
{
  const cl_el = e.target;
  const pn_el = e.currentTarget;

  if(cl_el.id === 'ordertype')
    flipOrderType(cl_el, pn_el);
  else if(cl_el.id === 'div_trans_btn')
    createOrder(cl_el, pn_el);
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
  else if(cl_el.id === 'pos_exit_cb')
    return;
}

function flipOrderType(c, p)
{
  submitOWinBtn.disabled = true;
  c.textContent = c.textContent === 'MARKET' ? 'LIMIT' : 'MARKET';
  const limitp = qSel(p, 'lmtprice', 'id');
  limitp.disabled = c.textContent === 'MARKET' ? true: false;
  if(c.textContent === 'MARKET') 
    limitp.value = "";
}

function hl_row(c, p)
{
  const scrip = expandSymbol(p.title);
  const oc = OptionChain.get(scrip.expiry_date);
  const r = oc.row_map.get(p.title);
  r.hl = !r.hl;
  r.row.classList.toggle('row_background');
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

function position_cb_action(){
  const checkboxes = document.querySelectorAll('#pos_exit_cb');
  const checkedIdx = Array.from(checkboxes)
  .map((cb, i) => cb.checked ? i : null)
  .filter(val => val !== null);

  exit_pos_btn.style.display = checkedIdx.length > 0 ? 'block' : 'none';
  pos_all_cb.checked = checkedIdx.length === checkboxes.length;
}