const timerText = document.getElementById("timer");
const positions = new Array(0);
const optionChains = new Array(0);
//const uuid = crypto.randomUUID();
var wsping;
const sOrderSubmit =  new Audio('./ordersubmit.wav');
  
const toggle = document.getElementById('toggleBasket');
const cbAll = document.getElementById('exitAll');
const exitPositionBtn = document.getElementById('exitPositionBtn');
const countSpan = document.getElementById('count');
const order_window_row_template = document.querySelector('#order-window-row');
const position_table_row_template = document.querySelector('#position-table-row');
const option_chain_header = document.querySelector('#oc-head-row');
const oWindow = document.getElementById('orderwindow');
const orderlistDiv = document.getElementById('order-list');

/*--Custom Tags------------------------------------------------------------------------------------------------------------------------------*/
class TradeButtons extends HTMLElement {
  connectedCallback() {

    this.innerHTML = `
      <div class="hover-content">
          <button  id="buyCE" class="smallbutton buy" onclick="prepareOrderWindow(this)">B</button>
          <button  id="attn" class="smallbutton order" onclick="">!</button>
          <button  id="sellCE" class="smallbutton sell" onclick="prepareOrderWindow(this)">S</button> 
      </div>    
    `;
  }
}
customElements.define('trade-buttons', TradeButtons);

/*--Event Listeners--------------------------------------------------------------------------------------------------------------------------*/
const qBox = new EventTarget();
qBox.addEventListener('vix', (event) => {
  vixChart(event.detail);
});
qBox.addEventListener('futures', (event) => {
  futuresChart(event.detail);
});
/*
toggle.addEventListener('change', function() {
  var action = (this.checked) ? 'BUY' : 'SELL';
});
*/
cbAll.addEventListener('change', () => {
  var checkboxes = document.querySelectorAll('#exitcb');
  checkboxes.forEach(cb => cb.checked = cbAll.checked);
  exitCBEvent();
});

exitPositionBtn.onclick = (event) => {
  
  toggle.disabled = true;    

  var checkboxes = document.querySelectorAll('#exitcb');
  const checkedIndexes = Array.from(checkboxes)
  .map((cb, i) => cb.checked ? i : null)
  .filter(val => val !== null);
  
  console.log("Selected Indexes:", checkedIndexes);
  checkedIndexes.forEach((idx) => {
    var p = positions[idx];  
    var symbol = p.value('symbol');
    var action = Math.sign(p.value('unbookedQ')) === 1 ? 'S' : 'B';
    
    let neworder = new Order(symbol, action);
    neworder.quantity = Math.abs(p.value('unbookedQ'));
    neworder.cprice = p.value('LTP');
    neworder.pricetype = 'MARKET';
    neworder.price = 0;
    neworder.product = 'NRML';
    appendOrderRow(createOrderRow(neworder), true);
  });
  event.target.style.display = 'none';
  showOrderWindow();
}

closeOListBtn.onclick = () => {
  orderlistDiv.style.display = 'none';
};

closeOWinBtn.onclick = () => {
  var tBody = document.getElementById('tbody-order-panel');
  tBody.innerHTML = "";
  oWindow.style.display = "none";
  qBox.removeEventListener('strikex', orderPanelQuote);
  toggle.disabled = false;
};
/*--------------------------------------------------------------------------------------------------------------------------------*/