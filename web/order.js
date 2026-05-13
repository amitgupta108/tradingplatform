class Order{
  appid = instrument.appid;
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
    this.mode = instrument.mode === 0 ? 'history' : 'live';
  }
}

function submitOrder(clickedBtn) 
{  
  const rows = Array.from(order_rows_tbody.rows);
  var isError = false;
  rows.forEach((r) => 
  {  
    const pricetype = r.querySelector('#ordertype').innerText;
    if(pricetype === 'LIMIT')
    {
      const price = r.querySelector('#lmtprice').value;
      if( price === "") {
        isError = true;
        qSel(r, 'lmtprice', 'id').style.border = '1px solid red';
      }
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

function loadOrders(orders)
{
  orders.forEach((order) => {
    console.log('Recovered Orders ' + JSON.stringify(order));
    if(symtoinstrument(order.symbol).stockCode === instrument.stockCode)
    {
      var p = Position.findPosition(order.symbol, true);
      p.orderupdate(order, true);
    }
  });
}


function displayOrderList(btn, parent)
{
  const symbol = parent.title;
  const p = Position.findPosition(symbol, false);
  order_list_thead.querySelector('tr').title = symbol;
  order_list_thead.querySelector('td').innerText = symtoinstrument(symbol).name;

  order_list_tbody.innerHTML = "";
  
  var tqty = 0;
  p.orders.forEach((o, idx) => {
    var newtr = tRow(t_order_list_row, true);

    newtr.title = o.orderid;
    var qty = o.state.startsWith('complete') ? o.filled_q : 0;
    tqty = tqty + Number(qty * (o.action === 'BUY' ? 1 : -1));

    newtr.childNodes[1].innerText = o.orderid;
    newtr.childNodes[3].innerText = o.action.slice(0, 1);
    newtr.childNodes[5].innerText = o.filled_q + ' / ' + o.quantity;
    newtr.childNodes[7].innerText = o.pricetype.slice(0, 1);
    newtr.childNodes[9].innerText = tqty;
    newtr.childNodes[11].innerText = (o.state === 'opened' ? o.price : o.state === 'cancelled' ? 0 : o.pricedAt);
    newtr.childNodes[13].innerText = o.state;
    newtr.childNodes[15].childNodes[1].innerText = (o.state === 'opened' ? 'X' : '');
    if(o.state === 'opened') 
      newtr.childNodes[15].childNodes[1].classList.add('clickable');
          
    order_list_tbody.append(newtr);
  });
  orderlistDiv.style.display = 'flex';
}
