var uQuoteGl;
const timerText = document.getElementById("timer");
timerText.innerText = new Date(instrument.simStartTime).toDateString();

const positions = new Array(0);
const optionChains = new Array(0);
//const uuid = crypto.randomUUID();
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

const toggle = document.getElementById('toggleBasket');

toggle.addEventListener('change', function() {
  var action = (this.checked) ? 'BUY' : 'SELL';
});
/*--------------------------------------------------------------------------------------------------------------------------------*/

class TradeButtons extends HTMLElement {
  connectedCallback() {

    this.innerHTML = `
      <div class="hover-content">
          <button  id="buyCE" class="smallbutton buy" onclick="raiseOrder(this)">B</button>
          <button  id="sellCE" class="smallbutton sell" onclick="raiseOrder(this)">S</button> 
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

const order_window_row_template = document.querySelector('#order-window-row');
