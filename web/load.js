const timerText = document.getElementById("timer");
const positions = new Array(0);
const optionChains = new Array(0);
const sOrderSubmit =  new Audio('./ordersubmit.wav');
  
const toggle = document.getElementById('toggleBasket');
const exit_pos_btn = document.getElementById('exit_all_cb');
const exitPositionBtn = document.getElementById('exitPositionBtn');
const closeOWinBtn = document.getElementById('ow_close_btn');

const t_order_list_row = document.getElementById('order-list-tr');
const t_order_window_row = document.querySelector('#order-window-row');
const t_position_table_row = document.querySelector('#position-table-row');
const t_option_chain_header = document.querySelector('#oc-head-row');
const t_option_chain_call_row = document.getElementById('option-chain-call-row');
const t_option_chain_put_row = document.getElementById('option-chain-put-row');

const oWindow = document.getElementById('orderwindow');
const orderlistDiv = document.getElementById('order-list');
const order_rows_tbody = document.getElementById('tbody-order-panel');
const h_oc_div = document.getElementById('Exp1');

/*--Custom Tags------------------------------------------------------------------------------------------------------------------------------*/
class TradeButtons extends HTMLElement {
  connectedCallback() {

    this.innerHTML = `
      <div class="hover-content">
          <label id='symbol_any_row' hidden></label>
          <button  id="buyCE" class="smallbutton buy">B</button>
          <button  id="attn" class="smallbutton order" onclick="">!</button>
          <button  id="sellCE" class="smallbutton sell">S</button> 
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

qBox.addEventListener('strikex', (event) =>
{
  var rows = Array.from(order_rows_tbody.rows);
  rows.forEach((r) => {
    if(event.detail.symbol === r.querySelector("#owsymbol").innerText) {
      r.querySelector("#owprice").innerText = event.detail.close.toFixed(2);
      
      const lml_price_tb = qSel(r, 'lmtprice', 'id');
      const price_type_lb = qSel(r, 'ordertype', 'id');
      if(lml_price_tb.value === '' && price_type_lb.innerHTML === 'LIMIT') {
        lml_price_tb.value = event.detail.close.toFixed(2);
        lml_price_tb.style.border = '1px solid grey';
      }
    }
  });
});

exit_pos_btn.addEventListener('change', () => {
  var checkboxes = document.querySelectorAll('#exit_checkbox');
  checkboxes.forEach(cb => cb.checked = cbAll.checked);
});

const pBox = new EventTarget();

exitPositionBtn.onclick = (event) => {
  toggle.disabled = true;
  var checkboxes = document.querySelectorAll('#exit_checkbox');
  const checkedIndexes = Array.from(checkboxes)
  .map((cb, i) => cb.checked ? i : null)
  .filter(val => val !== null);
  
  checkedIndexes.forEach((idx) => {
    var p = positions[idx];  
    var symbol = p.value('symbol');
    var action = Math.sign(p.value('unbookedQ')) === 1 ? 'S' : 'B';
    
    let neworder = new Order(symbol, action, Math.abs(p.value('unbookedQ')));
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
  oWindow.style.display = "none";
  order_rows_tbody.innerHTML = "";
  toggle.disabled = false;
};
/*--------------------------------------------------------------------------------------------------------------------------------*/