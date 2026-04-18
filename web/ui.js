function prepareOrderWindow(clickedBtn)
{
  var tBody = document.getElementById('tbody-order-panel');  

  document.getElementById('toggleBasket').disabled = true;    
  var multi = document.getElementById('toggleBasket').checked;
  if(!multi)
    tBody.innerHTML = '';

  let symbol = clickedBtn.parentNode.parentNode.nextElementSibling.innerText;
  let action = clickedBtn.innerText;

  var tr = createOrderRow(new Order(symbol, action));
  
  tBody.prepend(tr); 
  showOrderWindow(action);
}

function createOrderRow(order){
  
  var scrip = symtoinstrument(order.symbol);
  var scripName = scrip.expiry + ' ' + scrip.strike + ' ' + scrip.right;

  var tr = document.importNode(order_window_row_template.content, true).querySelector('tr');
  tr.querySelector('#owsymbol').innerText  = order.symbol;
  tr.querySelector('#scripName').innerText  = scripName;
  tr.querySelector('#lmtprice').innerText  = "";
  if(order.quantity != undefined)
    tr.querySelector('#lotSelect').value = order.quantity / instrument.lotsize;
  if(order.pricetype !== undefined)
    tr.querySelector('#ordertype').innerText = order.pricetype;

  const rowBtn = tr.querySelector("#owaction");
  rowBtn.innerText = order.action;
  if(order.action === 'B')
    rowBtn.classList.replace('sell', 'buy');
  else 
    rowBtn.classList.replace('buy', 'sell');

  return tr;
}

function showOrderWindow(action, wCSS)
{
  const oWindow = document.getElementById('orderwindow');

  oWindow.classList.remove('multi');
  oWindow.classList.remove('buy');
  oWindow.classList.remove('sell');
  
  var multi = document.getElementById('toggleBasket').checked;
  if(wCSS === undefined)
    wCSS = multi ? 'multi' : action === 'B' ? 'buy' : 'sell';
  oWindow.classList.add(wCSS);
  oWindow.style.display = "block";

  setTimeout(() => {
      document.getElementById('orderwindow').classList.add('show');
      qBox.addEventListener('strikex', orderPanelQuote);
    }, 10);
}

function orderPanelQuote(event)
{
  const tBody = document.getElementById('tbody-order-panel');
  var rows = tBody.rows;

  for(var i = 0; i < rows.length; i++)
  {
    if(event.detail.symbol === rows[i].querySelector("#owsymbol").innerText)
      rows[i].querySelector("#owprice").innerText = event.detail.close.toFixed(2);
  }
}

function flipAction(orderRowBtn)
{
  var action = orderRowBtn.innerText;
  orderRowBtn.innerText = action === 'B' ? 'S' : 'B';
  if(action === 'B')
    orderRowBtn.classList.replace('buy', 'sell');
  else
    orderRowBtn.classList.replace('sell', 'buy'); 
}

function removeOrderRow(btn) {
  const row = btn.closest('tr');
  row.remove(); // Deletes the underlying row
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

function displayOrderList(event)
{
  const btn = event.target;  
  const symbol = btn.parentNode.parentNode.title;
  const p =  Position.findPositionRow(symbol);

  const row = document.getElementById('order-list-tr');
  
  document.querySelector('#order-list-body').innerHTML = "";
  p.finalorders.forEach((o) => {
    var clone = document.importNode(row.content, true);
    var newtr = clone.querySelector('tr');

    newtr.childNodes[1].innerText = o.pricedAt;
    newtr.childNodes[3].innerText = o.quantity;
    newtr.childNodes[5].innerText = o.state;

    document.querySelector('#order-list-body').append(newtr);
  });
}

function exitCBEvent()
{
  const checkedIndexes = Array.from(checkboxes)
  .map((cb, i) => cb.checked ? i : null)
  .filter(val => val !== null);

  const hasSelection = checkedIndexes.length > 0;
  exitBtn.style.display = hasSelection ? 'block' : 'none';
  countSpan.textContent = checkedIndexes.length;
  exitAll.checked = checkedIndexes.length === checkboxes.length;
}

const orderlistDiv = document.getElementById('order-list');
orderlistDiv.classList.toggle('hidden');
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
document.getElementById("tabButton3").childNodes[1].innerText = instrument.oExpiryNxt;