function orderOC(event, action, right)
{
  let btn = event.target;  
  let row = btn.parentNode.parentNode.parentNode;

  let colStrikePrice = right === 'Call' ? 3 : 4;
  let colLTP = right === 'Call' ? 2 : 5;
  let symbol = row.cells[colStrikePrice].childNodes[6].innerText;
  let cprice = row.children.item(colLTP).innerText;

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
    const container = document.getElementById('message-container');
    if (!container) return;
    container.style.display = "block";

    const ow = document.getElementById('orderwindow');
    ow.classList.remove('show');
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
    };

    setTimeout(() => {
        ow.classList.add('show');
    }, 10);
}

function submitOrder() 
{  
  sOrderSubmit.play();

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
}

function orderquote(q) 
{
  var symbol = document.getElementById('owsymbol').innerText;
  if(symbol === q.symbol)
    document.getElementById('owprice').innerText = q.close;
}
