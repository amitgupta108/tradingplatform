const positions = new Map();
const pNL_all = {booked: 0.00, unbooked: 0.00}
const decimal2 = ['bookedPL', 'averageP', 'LTP', 'unbookedPL', 'totalPL'];
let in_prep_orders = {};
const optionChains = new Array(0);
const sOrderSubmit =  new Audio('./ordersubmit.wav');
let data_reload = false;

const oc_container = document.getElementById('c_oc_div');
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
const exit_pos_btn = document.getElementById('exitPositionBtn');
const pos_all_cb = document.getElementById('exit_all_cb');
const closeOWinBtn = document.getElementById('ow_close_btn');
const submitOWinBtn = document.getElementById('ow_submit_btn');
const bottom_btns = document.getElementById('bottomPanel').querySelectorAll('button');

const socn = document.getElementById('socn');
const ws_start_btn = document.getElementById('ws_start');
const ws_stop_btn = document.getElementById('ws_stop');
const date_label = document.getElementById('timer_date_lb');
const time_label = document.getElementById('timer_time_lb');
const spot_label = document.getElementById('timer_spot_lb');
const latency_label = document.getElementById('timer_latency_lb');
const expiry_btn_1 = document.getElementById('expiry_btn_1');
const expiry_btn_2 = document.getElementById('expiry_btn_2');
const simDate = new Date(instrument.simStartTime);

date_label.textContent = simDate.toDateString();
expiry_btn_1.textContent = instrument.oExpiries[0];
expiry_btn_2.textContent = instrument.oExpiries[1];

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
const pNL = new EventTarget();

qBox.addEventListener('index', (event) => {
  const q = event.detail;
  const ltp = Number(q.ltp).toFixed(2);
  spot_title = ' | S: ' + ltp;
  document.title = fut_title + spot_title;
  spot_label.textContent = ltp;
  
  var lt = new Date(q.ltt);
  time_label.textContent = lt.toLocaleTimeString();
});

qBox.addEventListener('futures', (event) => {
  const q = event.detail;
  fut_title = 'F: ' + q.ltp.toFixed(2);
  document.title = fut_title + spot_title;
  latency_label.textContent = Date.now() - q.ltt;
});

qBox.addEventListener('strikex', (event) => {
  if(positions.size > 0 && positions.get(event.detail.symbol) !== undefined)
  {
    const pos = positions.get(event.detail.symbol);

    const unbookedPL = (event.detail.ltp - pos.booked.avgP) * pos.psize;
    const pnlchange = {change_unb: unbookedPL - pos.value('unbookedPL'), change_b: 0};
    pNL.dispatchEvent(generateEvent('change', pnlchange));

    pos.value('LTP', event.detail.ltp);
    pos.value('unbookedPL', unbookedPL);
    pos.value('totalPL', pos.booked.pl + unbookedPL);
  }
});

qBox.addEventListener('strikex', (event) => 
{
  const n_rows = order_rows_tbody.rows.length;
  if(n_rows === 0)
    return;

  var rows = Array.from(order_rows_tbody.rows);
  rows.forEach((r) => {
    if(event.detail.symbol === r.querySelector("#owsymbol").textContent) {
      r.querySelector("#owprice").textContent = event.detail.ltp.toFixed(2);
      
      const lmt_price_tb = qSel(r, 'lmtprice', 'id');
      const price_type_lb = qSel(r, 'ordertype', 'id');
      if(lmt_price_tb.value === '' && price_type_lb.innerText === 'LIMIT')
        lmt_price_tb.value = event.detail.ltp.toFixed(2);
    }
  });
});

pNL.addEventListener('change', (event) => {
  pNL_all.booked += event.detail.change_b;
  pNL_all.unbooked += event.detail.change_unb;

  gtotal_booked.textContent = pNL_all.booked.toFixed(2);
  gtotal_unbooked.textContent = pNL_all.unbooked.toFixed(2);
  gtotal_pnl.textContent = (pNL_all.booked + pNL_all.unbooked).toFixed(2);
})

pos_all_cb.addEventListener('change', (event) => {

  var checkboxes = positions_tBody.querySelectorAll(`input[type="checkbox"]:not(:disabled)`);
  checkboxes.forEach(cb => cb.checked = pos_all_cb.checked);

  exit_pos_btn.style.display = pos_all_cb.checked ? 'block' : 'none';
});

exit_pos_btn.onclick = (event) => {
  const checkboxes = 
    Array.from(positions_tBody.querySelectorAll('input[type="checkbox"]:checked'));
  
  checkboxes.forEach((cb) => {
    const symbol = cb.parentNode.parentNode.title;
    const p = Position.findPosition(symbol, false);
    const action = Math.sign(p.psize) === 1 ? 'S' : 'B';
    
    appendOrderRow(symbol, action, Math.abs(p.psize/LOT_SIZE[instrument.stockCode]));
    cb.checked = false;
  });
  event.target.style.display = 'none';
  pos_all_cb.checked = false;
  showOrderWindow();
}

closeOWinBtn.onclick = () => {
  hideOWin();
}
/*--------------------------------------------------------------------------------------------------------------------------------*/