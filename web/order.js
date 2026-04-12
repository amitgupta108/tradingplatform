function raiseOrder(btn)
{
  let symbol = btn.parentNode.parentNode.nextSibling.innerText;
  orderpanel(symbol, btn.innerText)
}

function orderPos(btn)
{
  let row = btn.parentNode.parentNode.parentNode;
  let symbol = row.title;

  orderpanel(symbol, btn.innerText);
}

function orderpanel(symbol, action) 
{
  var tBodyIdx = document.getElementById('toggleBasket').checked ?  1 : 0;  
  
  const oWindow = document.getElementById('orderwindow');
  var tBodies = oWindow.querySelectorAll('tbody');  
  var tBody = tBodies[tBodyIdx];  
  var existingrows = Array.from(tBody.querySelectorAll('tr'));
  existingrows.pop();

  var tr;
  if(tBodyIdx === 1 || tBody.rows.length < 2) {
    tr = document.importNode(order_window_row_template.content, true).querySelector('tr');
    var exr = existingrows.find((r) => r.querySelector('#owsymbol').innerText === symbol);

    if(exr === undefined)
      tBody.prepend(tr);
  }
  else {
    tr = tBody.rows[0];
  }
  
  var scrip = symtoinstrument(symbol);
  var scripName = scrip.expiry.slice(0,3) + ' ' + scrip.strike + ' ' + scrip.right;
    
  tr.querySelector('#owsymbol').innerText  = symbol;
  tr.querySelector('#scripName').innerText  = scripName;
  tr.querySelector('#lmtprice').innerText  = "";

  orderwindow(tr.querySelector("#owaction"), action);
  oWindow.style.display = "block";

  setTimeout(() => {
      tBodies[1 - tBodyIdx].style.display = 'none';
      tBodies[tBodyIdx].style.display = 'block';
      document.getElementById('orderwindow').classList.add('show');
      qBox.addEventListener('strikex', orderPanelQuote);
    }, 10);

  closeBtn.onclick = () => {
    oWindow.style.display = "none";
      qBox.removeEventListener('strikex', orderPanelQuote);
    };
}

function orderwindow(actionBtn, action)
{ 
  if(action === 'F') //flip
    action = actionBtn.innerText === 'B' ? 'S' : 'B';
  
  actionBtn.innerText = action;
  actionBtn.classList.remove('smallbutton', action === 'B' ? 'sell' : 'buy');
  actionBtn.classList.add('smallbutton', action === 'B' ? 'buy' : 'sell');

  const ow = document.getElementById('orderwindow');
  const ordersTable = ow.querySelector('table');

  if(document.getElementById('toggleBasket').checked)
  {
    ow.classList.remove('orderwindow', 'buy');
    ow.classList.remove('orderwindow', 'sell');
    ow.classList.add('orderwindow', 'multi');
  }
  else
  {  
    ow.classList.remove('orderwindow', action === 'B' ? 'sell' : 'buy');
    ow.classList.add('orderwindow', action === 'B' ? 'buy' : 'sell');
  }
}

function orderPanelQuote(event)
{
  var tBodyIdx = document.getElementById('toggleBasket').checked ?  1 : 0;  

  const container = document.getElementById('orderwindow');
  var tBody = container.querySelectorAll('tbody')[tBodyIdx];
  var rows = tBody.rows;

  for(var i = 0; i < rows.length - 1; i++)
  {
    if(event.detail.symbol === rows[i].querySelector("#owsymbol").innerText)
      rows[i].querySelector("#owprice").innerText = event.detail.close.toFixed(2);
  }
}

function submitOrder() 
{  
  const oWindow = document.getElementById('orderwindow');
  const rows = Array.from(oWindow.querySelectorAll('tr'));
  const neworders = new Array(0);
  rows.forEach((r) => 
  {  
    var symbol = r.querySelector('#owsymbol') !== null
    if(symbol !== null || symbol !== undefined)
    {
      var action = r.querySelector('#owaction').innerText;
      var price = r.querySelector('#lmtprice').value; 
      var lot =  r.querySelector('#lotselect').value;

      let neworder = {
        symbol: symbol,
        action: ( action === 'B' ? 'BUY' : 'SELL'),
        lot: lot * (action === 'S' ? -1 : 1),
        quantity: lot * instrument.lotsize,
        cprice: r.querySelector('#owprice').innerText,
        pricetype: r.querySelector('#ordertype').innerText,
        price: price === "" ? 0 : price,
        product: 'NRML',
        exchange: instrument.exc,
        stockCode: instrument.stockCode,
        time: Date.now(),
        state: 'opened'
      };
      var p = Position.findPositionRow(symbol);
      if(p === undefined)
        p = new Position(symbol);

      neworders.push(p.updatePosition(neworder));
    }
  });
  emit('order', neworders);
  sOrderSubmit.play();
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

function changeText() {
  document.getElementById("ordertype").innerText 
      = document.getElementById("ordertype").innerText === 'MARKET' ? 'LIMIT' : 'MARKET';
}