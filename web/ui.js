function raiseOrder(btn)
{
  let symbol = btn.parentNode.parentNode.nextElementSibling.innerText;
  orderpanel(symbol, btn.innerText)
}

function orderpanel(symbol, action) 
{
  var tBodyIdx = document.getElementById('toggleBasket').checked ?  1 : 0;  
  
  const oWindow = document.getElementById('orderwindow');
  var tBodies = oWindow.querySelectorAll('tbody');  
  var tBody = tBodies[tBodyIdx];  
  var existingrows = Array.from(tBody.querySelectorAll('tr'));

  var tr;
  if(tBodyIdx === 1 || tBody.rows.length < 1) {
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

function switchTabs(evt, container, tabName) {
  var i, tabcontent, tablinks;
  var tabcontainer = document.getElementById(container);
  var tabcontent = tabcontainer.querySelectorAll('.tab-content');
  for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
  }
  tablinks = tabcontainer.querySelectorAll('.tab');
  for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[0].className.replace(" active-tab", "");
  }
  document.getElementById(tabName).style.display = "block";  
  evt.currentTarget.className += " active-tab";
}

function orderPanelQuote(event)
{
  var tBodyIdx = document.getElementById('toggleBasket').checked ?  1 : 0;  

  const container = document.getElementById('orderwindow');
  var tBody = container.querySelectorAll('tbody')[tBodyIdx];
  var rows = tBody.rows;

  for(var i = 0; i < rows.length; i++)
  {
    if(event.detail.symbol === rows[i].querySelector("#owsymbol").innerText)
      rows[i].querySelector("#owprice").innerText = event.detail.close.toFixed(2);
  }
}

function changeText(self) {
  self.innerText = self.innerText === 'MARKET' ? 'LIMIT' : 'MARKET';
}

function writeProfitLoss()
{  
  let bookedPL = 0; let unbookedPL = 0;

  for (let i = 0; i < positions.length ; i++)
  {
    bookedPL += Number(positions[i].value('bookedPL'));
    unbookedPL += Number(positions[i].value('unbookedPL')); 
  }

  document.getElementById("vBookedPL").innerText = bookedPL.toFixed(2);
  document.getElementById("vUnbookedPL").innerText = unbookedPL.toFixed(2);
  document.getElementById("vTotalPL").innerText = (bookedPL + unbookedPL).toFixed(2);
}
/*
function loadPositions(ps)
{
  ps.forEach(element => {
    if(symtoinstrument(element.symbol).stockCode === instrument.stockCode)
    {
      var p = new Position(element.symbol);
      p.orders = [{
        orderN: 1,
        symbol: element.symbol,
        pricedAt: element.average_price,
        quantity: element.quantity,
      }];
      p.orderN = 1;
      refreshPositionPL(p, element.ltp);
    }
  });
}
*/

document.getElementById("tabButton1").childNodes[1].innerText = instrument.oExpiry;
document.getElementById("tabButton2").childNodes[1].innerText = instrument.oExpiryNxt;