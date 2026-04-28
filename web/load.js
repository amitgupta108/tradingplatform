const timerText = document.getElementById("timer");
const positions = new Array(0);
const optionChains = new Array(0);
const sOrderSubmit =  new Audio('./ordersubmit.wav');
  
const toggle = document.getElementById('toggleBasket');
const pos_all_cb = document.getElementById('exit_all_cb');
const exit_pos_btn = document.getElementById('exitPositionBtn');
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
const positions_tBody = document.getElementById('positions_tbody');

/*--Custom Tags------------------------------------------------------------------------------------------------------------------------------*/
class TradeButtons extends HTMLElement {
  connectedCallback() {

    this.innerHTML = `
      <div class="hover-content">
          <label id='symbol_any_row' hidden></label>
          <button  id="div_trans_btn" class="smallbutton buy">B</button>
          <button  id="attn" class="smallbutton order" onclick="">!</button>
          <button  id="div_trans_btn" class="smallbutton sell">S</button> 
      </div>    
    `;
  }
}
customElements.define('trade-buttons', TradeButtons);

/*--Event Listeners--------------------------------------------------------------------------------------------------------------------------*/
const pBox = new EventTarget();
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

pos_all_cb.onchange = (event) => {
  var checkboxes = document.querySelectorAll('#pos_exit_cb');
  checkboxes.forEach(cb => cb.checked = pos_all_cb.checked);

  exit_pos_btn.style.display = pos_all_cb.checked ? 'block' : 'none';
}

function position_cb_action(){
  const checkboxes = document.querySelectorAll('#pos_exit_cb');
  const checkedIdx = Array.from(checkboxes)
  .map((cb, i) => cb.checked ? i : null)
  .filter(val => val !== null);

  exit_pos_btn.style.display = checkedIdx.length > 0 ? 'block' : 'none';
  pos_all_cb.checked = checkedIdx.length === checkboxes.length;
}

exit_pos_btn.onclick = (event) => {
  const checkboxes = 
    Array.from(positions_tBody.querySelectorAll('input[type="checkbox"]:checked'));
  
  const isBasket = checkboxes.length > 1;
  checkboxes.forEach((cb) => {
    const pRow = cb.parentNode.parentNode;
    const symbol = pRow.title;
    const p = Position.findPosition(symbol, false);
    const psize = p.value('unbookedQ');
    var action = Math.sign(psize) === 1 ? 'S' : 'B';
    
    let neworder = new Order(symbol, action, Math.abs(psize));
    neworder.pricetype = 'MARKET';
    appendOrderRow(neworder, isBasket);
  });
  event.target.style.display = 'none';
  showOrderWindow();
}

closeOListBtn.onclick = () => {
  orderlistDiv.style.display = 'none';
}

closeOWinBtn.onclick = () => {
  oWindow.style.display = "none";
  order_rows_tbody.innerHTML = "";
  toggle.disabled = false;
}
/*--------------------------------------------------------------------------------------------------------------------------------*/