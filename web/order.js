class Order{
  htmlelement;
  exchange = instrument.exc;
  stockCode = instrument.stockCode;
  time = Date.now();
  state = 'created';
  pricetype = 'LIMIT';
  product = 'NRML';
  symbol;
  action;

  constructor(symbol, action)
  {
    this.symbol = symbol;
    this.action = action;
  }
}

function qSel(element, name, type){
  type = type === 'id' ? '#' : type === 'css' ? '.' : '';
  return element.querySelector(type + name);
}

function submitOrder(clickedBtn) 
{  
  const rows = Array.from(ordersubmitBody.querySelectorAll('tr'));
  var error = false;
  var neworders = rows.map((r) => 
  {  
    var symbol = qSel(r, 'owsymbol', 'id').innerText;
    var action = r.querySelector('#owaction').innerText;
    var price = r.querySelector('#lmtprice').value;
    var lot = r.querySelector('#lotselect').value; 

    let neworder = new Order(symbol, action);
    neworder.quantity = lot * instrument.lotsize;
    neworder.pricetype = r.querySelector('#ordertype').innerText;
    if(price === "") {
      error = true;
      qSel(r, 'lmtprice', 'id').style.border = '1px solid red';
    }
    var p = Position.findPosition(symbol, true);

    p.orderlist(neworder);
    return neworder;
  });
  if(error)
    return;

  emit('order', neworders);
  sOrderSubmit.play();

  oWindow.style.display = 'none';
  ordersubmitBody.innerHTML = '';
  var checkboxes = document.querySelectorAll('#exitcb');
  checkboxes.forEach(cb => cb.checked = false);
  toggle.disabled = false;
}

function cancelorder(cancelBtn)
{
  var orderrow = cancelBtn.parentNode.parentNode;
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
  orders.forEach((order) => {
    if(symtoinstrument(order.symbol).stockCode === instrument.stockCode)
    {
      var p = Position.findPosition(order.symbol, true);
      p.orderupdate(order);
    }
  });
}