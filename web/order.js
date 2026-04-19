class Order{
  exchange = instrument.exc;
  stockCode = instrument.stockCode;
  time = Date.now();
  state = 'created';
  symbol;
  action;

  constructor(symbol, action)
  {
    this.symbol = symbol;
    this.action = action;
  }
}

function submitOrder() 
{  
  var tBody = oWindow.querySelector('#tbody-order-panel');  
  const rows = Array.from(tBody.querySelectorAll('tr'));
  const neworders = new Array(0);
  rows.forEach((r) => 
  {  
    var symbol = r.querySelector('#owsymbol').innerText;
    if(symbol !== null || symbol !== undefined)
    {
      var action = r.querySelector('#owaction').innerText;
      var price = r.querySelector('#lmtprice').value;
      var lot = r.querySelector('#lotselect').value; 

      let neworder = new Order(symbol, action);
      neworder.quantity = lot * instrument.lotsize;
      neworder.cprice = Number(r.querySelector('#owprice').innerText);
      neworder.pricetype = r.querySelector('#ordertype').innerText;
      neworder.price = price === "" ? 0 : Number(price);
      neworder.product = 'NRML';  

      var p = Position.findPositionRow(symbol);
      if(p === undefined)
        p = new Position(symbol);
      
      p.orderlist(neworder);
      neworders.push(neworder);
    }
  });
  emit('order', neworders);
  sOrderSubmit.play();

  oWindow.style.display = 'none';
  tBody.innerHTML = '';
  var checkboxes = document.querySelectorAll('#exitcb');
  checkboxes.forEach(cb => cb.checked = false);
  toggle.disabled = false;
}

function cancelOrder(cancelBtn)
{
  var orderrow = cancelBtn.parentNode.parentNode;
  var p = Position.findPositionRow(orderrow.title);
  emit('cancelorder', p.finalorders[orderrow.rowIndex]);
}

function loadOrders(response)
{
  response.orders.forEach((order) => {
    if(symtoinstrument(order.symbol).stockCode === instrument.stockCode)
    {
      order.state = order.order_status === 'complete' ? 'completed' : order.order_status;
      order.pricedAt = order.average_price;

      var p = positions.find((e) => e.symbol === order.symbol);
      if(p === undefined)
      {
        p = new Position(order.symbol);
        p.orders.push(order);
      }
      else
      {
        var existing = p.orders.find((o) => o.orderid === order.orderid);
        if(existing !== undefined)
          existing.recon = true;
        else
          p.orders.push(order);
      }
      //refreshPositionPL(p, element.ltp);
    }
  });
}