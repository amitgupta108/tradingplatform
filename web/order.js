function orderOC(event, action, expiry, right)
{
  const oc = OptionChain.get(expiry);

  let btn = event.target;  
  let row = btn.parentNode.parentNode.parentNode.parentNode;

  let symbol = oc.value(row.rowIndex - 1, 'sym', right);
  let cprice = oc.value(row.rowIndex - 1, 'price', right);

  orderpanel(symbol, action, cprice)
}

function orderPos(event, action)
{
  let btn = event.target;  
  let row = btn.parentNode.parentNode.parentNode;
  let symbol = row.title;
  let cprice = row.children[6].innerText;

  orderpanel(symbol, action, cprice);
}

function orderpanel(symbol, action, cprice) 
{
    const container = document.getElementById('floating-container');
    if (!container) return;
    container.style.display = "block";

    const ow = document.getElementById('orderwindow');
    ow.classList.remove('show');
    qBox.removeEventListener('strikex', orderPanelQuote);
    ow.classList.remove('orderwindow', action === 'BUY' ? 'sell' : 'buy');
    ow.classList.add('orderwindow', action === 'BUY' ? 'buy' : 'sell');

    var scrip = symtoinstrument(symbol);
    var heading = scrip.expiry + ' ' + scrip.strike + ' ' + scrip.right;
    
    document.getElementById("owsymbol").innerText = symbol;
    document.getElementById("owaction").innerText = action;
    document.getElementById("owheading").innerText = heading;
    document.getElementById("owprice").innerText = Number(cprice).toFixed(2);
    document.getElementById('lmtprice').value = "";
    
    closeBtn.onclick = () => {
        container.style.display = "none";
        qBox
    };

    setTimeout(() => {
        ow.classList.add('show');
        qBox.addEventListener('strikex', orderPanelQuote);
    }, 10);
}

function orderPanelQuote(event)
{
  if(event.detail.symbol === document.getElementById("owsymbol").innerText)
    document.getElementById("owprice").innerText = event.detail.close.toFixed(2);
}

function submitOrder() 
{  
  var symbol = document.getElementById("owsymbol").innerText;
  var action = document.getElementById("owaction").innerText;
  var lots = document.getElementById("lotselect").value;
  lots = (action === 'BUY' ? 1 : -1) * Number(lots);

  let neworder = {
    symbol: symbol,
    action: action, 
    quantity: lots * instrument.lotsize,
    cprice: document.getElementById("owprice").innerText,
    price: document.getElementById('lmtprice').value,
    type: document.querySelector('input[name="type"]:checked').value,
    exc: instrument.exc
  };
  var p = Position.findPositionRow(symbol);
  if(p === undefined)
    p = new Position(symbol);

  p.order(neworder);
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

    newtr.childNodes[1].innerText = o.average_price;
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
      order.average_price = order.price;
      
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