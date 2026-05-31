const positions = new Map();
let in_prep_orders = {};
const optionChains = new Array(0);
const sOrderSubmit =  new Audio('./ordersubmit.wav');
  
const oWindow = document.getElementById('orderwindow');
const orderlistDiv = document.getElementById('order-list');
const order_list_tbody = document.getElementById('order-list-tbody');
const order_list_thead = document.getElementById('order-list-thead');
const order_rows_tbody = document.getElementById('tbody-order-panel');
const positions_tBody = document.getElementById('positions_tbody');
const orderlist_row_overlay = document.getElementById('orderlist-row-overlay');

const t_order_list_row = document.getElementById('order-list-row');
const t_order_window_row = document.getElementById('order-window-row');
const t_position_table_row = document.getElementById('position-table-row');
const t_option_chain_header = document.getElementById('oc-head-row');
const t_option_chain_row = document.getElementById('option-chain-row');

const basket = document.getElementById('toggleBasket');
const pos_all_cb = document.getElementById('exit_all_cb');
const exit_pos_btn = document.getElementById('exitPositionBtn');
const closeOWinBtn = document.getElementById('ow_close_btn');
const submitOWinBtn = document.getElementById('ow_submit_btn');

const socn = document.getElementById('socn');
const date_label = document.getElementById('timer_date_lb');
const time_label = document.getElementById('timer_time_lb');
const spot_label = document.getElementById('timer_spot_lb');
const latency_label = document.getElementById('timer_latency_lb');
const expiry_label = document.getElementById('oc_expiry_lb');
const simDate = new Date(instrument.simStartTime);

date_label.textContent = simDate.toDateString();
expiry_label.textContent = instrument.oExpiry;

let spot_title = ' | S: ';
let fut_title = 'F: ';
let gtotal_booked =  document.getElementById("vBookedPL");
let gtotal_unbooked =  document.getElementById("vUnbookedPL");
let gtotal_pnl =  document.getElementById("vTotalPL");

/*--Custom Tags------------------------------------------------------------------------------------------------------------------------------*/

class TradeButtons extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="hover-content">
          <label id='symbol_any_row' hidden></label>
          <button  id="div_trans_btn" class="smallbutton buy">B</button>
          <button  id="row_attn_btn" class="smallbutton order">!</button>
          <button  id="div_trans_btn" class="smallbutton sell">S</button> 
      </div>    
    `;
  }
}
customElements.define('trade-buttons', TradeButtons);

/*--Event Listeners--------------------------------------------------------------------------------------------------------------------------*/
const pBox = new EventTarget();
const qBox = new EventTarget();

qBox.addEventListener('index', (event) => {
  const q = event.detail;
  const ltp = q.close.toFixed(2);
  spot_title = ' | S: ' + ltp;
  document.title = fut_title + spot_title;
  spot_label.textContent = ltp;
  
  var lt = new Date(q.ltt);
  time_label.textContent = lt.toLocaleTimeString();
  renderChart(indexSeries, iEmaSeries, q);
});

qBox.addEventListener('vix', (event) => {
  renderChart(vixSeries, undefined, event.detail);
});

qBox.addEventListener('futures', (event) => {
  const q = event.detail;
  fut_title = 'F: ' + q.close.toFixed(2);
  document.title = fut_title + spot_title;
  latency_label.textContent = Date.now() - q.ltt;
  renderChart(futuresSeries, fEmaSeries, q);
});

qBox.addEventListener('strikex', (event) => {
    var pos = positions.get(event.detail.symbol);
    if(pos !== undefined)
      pos.updateUnbookedPL(event.detail.close, 'quote');
});

qBox.addEventListener('strikex', (event) =>
{
  const n_rows = order_rows_tbody.rows.length;
  if(n_rows === 0)
    return;

  var rows = Array.from(order_rows_tbody.rows);
  rows.forEach((r) => {
    if(event.detail.symbol === r.querySelector("#owsymbol").textContent) {
      r.querySelector("#owprice").textContent = event.detail.close.toFixed(2);
      
      const lml_price_tb = qSel(r, 'lmtprice', 'id');
      const price_type_lb = qSel(r, 'ordertype', 'id');
      if(lml_price_tb.value === '' && price_type_lb.innerText === 'LIMIT')
        lml_price_tb.value = event.detail.close.toFixed(2);
    }
  });
});

pos_all_cb.onchange = (event) => {
  var checkboxes = positions_tBody.querySelectorAll(`input[type="checkbox"]:not(:disabled)`);
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
  
  checkboxes.forEach((cb) => {
    const symbol = cb.parentNode.parentNode.title;
    const p = Position.findPosition(symbol, false);
    const action = Math.sign(p.psize) === 1 ? 'S' : 'B';
    
    appendOrderRow(symbol, action, Math.abs(p.psize/instrument.lotsize));
    cb.checked = false;
  });
  event.target.style.display = 'none';
  pos_all_cb.checked = false;
  showOrderWindow();
}

closeOListBtn.onclick = () => {
  orderlistDiv.style.display = 'none';
}

closeOWinBtn.onclick = () => {
  hideOWin();
}
/*--------------------------------------------------------------------------------------------------------------------------------*/