function submitOrder() 
{  
  const oWindow = document.getElementById('orderwindow');
  var tBodies = oWindow.querySelectorAll('[id^="tbody-order-panel-"]');
  const idx = tBodies[0].style.display !== 'none' ? 0 : 1;
  const rows = Array.from(tBodies[idx].querySelectorAll('tr'));
  const neworders = new Array(0);
  rows.forEach((r) => 
  {  
    var symbol = r.querySelector('#owsymbol').innerText;
    if(symbol !== null || symbol !== undefined)
    {
      var action = r.querySelector('#owaction').innerText;
      var price = r.querySelector('#lmtprice').value;
      var lot = r.querySelector('#lotselect').value; 

      let neworder = {
        symbol: symbol,
        action: ( action === 'B' ? 'BUY' : 'SELL'),
        quantity: lot * instrument.lotsize,
        cprice: r.querySelector('#owprice').innerText,
        pricetype: r.querySelector('#ordertype').innerText,
        price: price === "" ? 0 : price,
        product: 'NRML',
        exchange: instrument.exc,
        stockCode: instrument.stockCode,
        time: Date.now(),
        state: 'created'
      };
      var p = Position.findPositionRow(symbol);
      if(p === undefined)
        p = new Position(symbol);

      neworders.push(p.orderlist(neworder));
    }
  });
  emit('order', neworders);
  sOrderSubmit.play();
  oWindow.style.display = 'none';
  tBodies[idx].innerHTML = '';
}

function displayOrderList(event)
{
  let btn = event.target;  
  let pRow = btn.parentNode.parentNode;
  let symbol = pRow.title;

  const row = document.getElementById('order-list-tr');
  const p =  Position.findPositionRow(symbol);
  
  document.querySelector('#order-list-body').innerHTML = "";
  p.orders.forEach((o) => {
    var clone = document.importNode(row.content, true);
    var newtr = clone.querySelector('tr');

    newtr.childNodes[1].innerText = o.pricedAt;
    newtr.childNodes[3].innerText = o.quantity;
    newtr.childNodes[5].innerText = o.state;

    document.querySelector('#order-list-body').append(newtr);
  });
}

function displayOrders(event)
{
  displayOrderList(event);
  const orderlistDiv = document.getElementById('order-list');
  orderlistDiv.classList.toggle('hidden');
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