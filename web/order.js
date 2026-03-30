var neworder = {};

function showMessage(event, action, right) {
    
    const container = document.getElementById('message-container');
    if (!container) return;
    container.style.display = "block";

    const ow = document.getElementById('orderwindow');
    ow.classList.remove('show');
    ow.classList.remove('orderwindow', action === 'BUY' ? 'sell' : 'buy');
    ow.classList.add('orderwindow', action === 'BUY' ? 'buy' : 'sell');

    document.getElementById("lotselect").value = '1';

    let btn = event.target;  
    let row = btn.parentNode.parentNode.parentNode;

    let colStrikePrice = right === 'Call' ? 3 : 4;
    let symbol = row.cells[colStrikePrice].childNodes[6].innerText;
    let colTLP = right === 'Call' ? 2 : 5;
    let cprice = row.cells[colTLP].childNodes[0].innerText;

    neworder.symbol = symbol;
    neworder.action = action;
    neworder.cprice = cprice;
    
    document.getElementById("owsymbol").innerText = symbol;
    
    closeBtn.onclick = () => {
        container.style.display = "none";
        neworder = {};
    };

    // Trigger the fade-in animation (setTimeout needed for CSS transition to work)
    setTimeout(() => {
        ow.classList.add('show');
    }, 10);
}

function enterPosition() 
{
  let lot = document.getElementById("lotselect").value;
  let lmtprice = document.getElementById('lmtprice').value;
  
  var p = Position.findPositionRow(neworder.symbol);
  if(p === undefined)
    p = new Position(neworder.symbol);

  p.order(neworder.action, Number(lot), Number(lmtprice), Number(neworder.cprice));
}
