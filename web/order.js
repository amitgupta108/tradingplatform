class Order{
  exchange = instrument.exc;
  appid = instrument.appid;
  pricetype = 'MARKET';
  product = 'NRML';
  price = 0;
  symbol;
  action;
  quantity;

  constructor(symbol, action, quantity)
  {
    this.symbol = symbol;
    this.action = action === 'B' ? 'BUY' : 'SELL';
    this.quantity = (quantity !== undefined) ? quantity : instrument.lotsize;
  }
}

function validate(clickedBtn)
{
  var isError = false;
  const rows = Array.from(order_rows_tbody.rows);
  const neworders = rows.map((r) => {
    const symbol = qSel(r, 'owsymbol', 'id').innerText;
    const action = r.querySelector('#ow_action_btn').innerText;
    const lot = r.querySelector('#lotselect').value; 
    const pricetype = r.querySelector('#ordertype').innerText;

    let n_order = new Order(symbol, action, lot * instrument.lotsize);
    n_order.pricetype = pricetype;
    if(pricetype === 'LIMIT') 
    {
      const h_price = qSel(r, 'lmtprice', 'id');
      if(h_price.value === "") {
        h_price.style.border = '1px solid red';
        isError = true;
      }
    else 
      n_order.price = Number(h_price.value);
    }
    return n_order;
  });
  in_prep_orders.isError = isError;
  in_prep_orders.orders = neworders;
  submitOWinBtn.disabled = isError;
}

function submitOrder(clickedBtn) 
{  
  if(in_prep_orders.isError)
    return;
  
  emit('order', in_prep_orders.orders);
  in_prep_orders.orders.forEach((o) => {
    Position.findPosition(o.symbol, true);
  })
  sOrderSubmit.play();
  console.log('submitted orders ' + JSON.stringify(in_prep_orders.orders));
  hideOWin();
}

function loadOrders(orders)
{
  orders.forEach((order) => {
    console.log('Recovered Orders ' + JSON.stringify(order));
    if(expandSymbol(order.symbol).stockCode === instrument.stockCode)
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
  order_list_thead.querySelector('td').innerText = expandSymbol(symbol).name;

  order_list_tbody.innerHTML = "";
  
  var tqty = 0;
  p.orders.forEach((o, idx) => {
    var newtr = tRow(t_order_list_row);

    newtr.title = o.orderid;
    var qty = o.state.startsWith('complete') ? o.filled_q : 0;
    tqty = tqty + Number(qty * (o.action === 'BUY' ? 1 : -1));

    newtr.childNodes[1].textContent = o.orderid;
    newtr.childNodes[3].textContent = o.action.slice(0, 1);
    newtr.childNodes[5].textContent = o.filled_q + ' / ' + o.quantity;
    newtr.childNodes[7].textContent = o.pricetype.slice(0, 1);
    newtr.childNodes[9].textContent = tqty;
    newtr.childNodes[11].textContent = (o.state === 'opened' ? o.price : o.state === 'cancelled' ? 0 : o.pricedAt).toFixed(2);
    newtr.childNodes[13].innerText = o.state;
    newtr.childNodes[15].childNodes[1].innerText = (o.state === 'opened' ? 'X' : '');
    if(o.state === 'opened') 
      newtr.childNodes[15].childNodes[1].classList.add('clickable');
          
    order_list_tbody.append(newtr);
  });
  orderlistDiv.style.display = 'flex';
}