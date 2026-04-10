var uQuoteGl;
const timerText = document.getElementById("timer");
timerText.innerText = new Date(instrument.simStartTime).toDateString();

const positions = new Array(0);
const optionChains = new Array(0);
//const uuid = crypto.randomUUID();
var socket;
var wsping;
const sOrderSubmit =  new Audio('./ordersubmit.wav');

/*--------------------------------------------------------------------------------------------------------------------------------*/
const qBox = new EventTarget();
qBox.addEventListener('vix', (event) => {
  vixChart(event.detail);
});
qBox.addEventListener('futures', (event) => {
  futuresChart(event.detail);
});

const toggle = document.getElementById('toggleAction');

toggle.addEventListener('change', function() {
  var action = (this.checked) ? 'BUY' : 'SELL';
  document.getElementById("owaction").innerText = action;
  ow.classList.remove('orderwindow', action === 'BUY' ? 'sell' : 'buy');
  ow.classList.add('orderwindow', action === 'BUY' ? 'buy' : 'sell');
});
/*--------------------------------------------------------------------------------------------------------------------------------*/
socket = io(`https://localhost:${window.location.port}`, {
  auth: {
    token: instrument.uuid,
    mode: instrument.mode,
    stock: instrument.stockCode
  },
  timeout: 60000,
  reconnectionDelay: 5000,
  reconnectionDelayMax: 5000,
});
/*--------------------------------------------------------------------------------------------------------------------------------*/

class TradeButtons extends HTMLElement {
  connectedCallback() {
    const expiry = this.getAttribute('expiry') === 'Expiry1' ? instrument.oExpiry : instrument.oExpiryNxt;
    const right = this.getAttribute('right');
    this.innerHTML = `
      <div class="hover-content">
          <button  id="buyCE" class="smallbutton buy" onclick="orderOC(event, 'BUY', '${expiry}', '${right}')">B</button>
          <button  id="sellCE" class="smallbutton sell" onclick="orderOC(event, 'SELL', '${expiry}', '${right}')">S</button> 
      </div>    
    `;
  }
}
customElements.define('trade-buttons', TradeButtons);
/*--------------------------------------------------------------------------------------------------------------------------------*/

const hRow = document.getElementById('oc-head-row');
var clone = document.importNode(hRow.content, true);
var newtr = clone.querySelector('tr');
document.getElementById('ocHead').append(newtr);

clone = document.importNode(hRow.content, true);
newtr = clone.querySelector('tr');
newtr.childNodes[1].style.color = 'black';
document.getElementById('ocHead2').append(newtr);
