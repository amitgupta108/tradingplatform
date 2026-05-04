class Order{
  exchange = instrument.exc;
  stockCode = instrument.stockCode;
  time = Date.now();
  state = 'created';
  pricetype = 'LIMIT';
  product = 'NRML';
  price = 0;
  symbol;
  action;
  quantity;

  constructor(symbol, action, quantity)
  {
    this.symbol = symbol;
    this.action = action;
    this.quantity = (quantity !== undefined) ? quantity : instrument.lotsize;
  }
}

function submitOrder(clickedBtn) 
{  
  const rows = Array.from(order_rows_tbody.querySelectorAll('tr'));
  var isError = false;
  rows.forEach((r) => 
  {  
    const pricetype = r.querySelector('#ordertype').innerText;
    const price = r.querySelector('#lmtprice').value;
    if(pricetype === 'LIMIT' && price === "") {
      isError = true;
      qSel(r, 'lmtprice', 'id').style.border = '1px solid red';
    }
  });
   
  if(isError)
    return;
  
  const neworders = rows.map((r) => {
    var symbol = qSel(r, 'owsymbol', 'id').innerText;
    var action = r.querySelector('#ow_action_btn').innerText;
    var lot = r.querySelector('#lotselect').value; 

    let n_order = new Order(symbol, action, lot * instrument.lotsize);
    n_order.pricetype = r.querySelector('#ordertype').innerText;
    if(n_order.pricetype === 'LIMIT')
      n_order.price = r.querySelector('#lmtprice').value;

    var p = Position.findPosition(symbol, true);
    p.orderlist(n_order);
    return n_order;
  });

  emit('order', neworders);
  sOrderSubmit.play();

  oWindow.style.display = 'none';
  order_rows_tbody.innerHTML = '';
  toggle.disabled = false;

  var checkboxes = document.querySelectorAll('#pos_exit_cb');
  checkboxes.forEach(cb => cb.checked = false);
}

function cancelorder(cancelBtn)
{
  var orderrow = cancelBtn.parentNode.parentNode.parentNode;
  var p = Position.findPosition(orderrow.title, false);
  emit('cancelorder', p.finalorders[orderrow.rowIndex-1]);
  orderlistDiv.style.display = 'none';
  sOrderSubmit.play();
}

function dropcancelorder(dropcancelBtn)
{
  dropcancelBtn.parentNode.style.display = 'none';
}

function loadOrders(orders)
{
  positions_tBody.innerHTML = '';

  orders.forEach((order) => {
    console.log('Recovered Orders ' + JSON.stringify(order));
    if(symtoinstrument(order.symbol).stockCode === instrument.stockCode)
    {
      var p = Position.findPosition(order.symbol, true);
      p.orderupdate(order, true);
    }
  });
}