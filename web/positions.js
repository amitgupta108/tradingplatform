function writeProfitLoss()
{  
  let bookedPL = 0;
  let unBookedPL = 0;

  for (let i = 0; i < positions.length ; i++)
  {
    bookedPL += Number(positions[i].value('plbooked'));
    unBookedPL += Number(positions[i].value('plunbooked')); 
  }

  document.getElementById("vBookedPL").innerText = bookedPL.toFixed(2);
  document.getElementById("vUnbookedPL").innerText = unBookedPL.toFixed(2);
  document.getElementById("vTotalPL").innerText = (bookedPL + unBookedPL).toFixed(2);
}

function setPositionQuote(q) {
  
  if(mode === 'L')
    return;

  var p = Position.findPositionRow(q.symbol);
  if (p != undefined)
  {
    p.value('delta', q.delta);
    p.value('price', q.close);
    
    var buyq = 0;
    var sellq = 0;
    var buyv = 0;
    var sellv = 0;
    
    p.orders.map((o) => 
    {  
      if(o.state === 'accepted')  
      {
        o.state = 'completed';
        o.price = q.close;
        o.time = q.ltt;
      } else if(o.state === 'completed')
      {
        if(o.quantity > 0)
        {
          buyq += o.quantity;
          buyv += o.quantity * o.price;
        }  
        else
        {
          sellq += o.quantity;
          sellv += o.quantity * o.price;
        }
      }
    });

    var abp = buyv / (buyq === 0 ? 1 : buyq);
    var asp = sellv / (sellq === 0 ? 1 : sellq);
    var psize = buyq + sellq;
    var hcount = buyq > (sellq * -1) ? buyq : sellq;
    var scount = hcount - psize;

    var bookedPL = Math.abs(scount) * (Math.round((asp - abp) * 100))/100 * instrument.lotsize;
    var unBookedPL = Math.abs(psize) * Math.round((psize > 0 ? q.close - abp : asp - q.close) * 100)/100 * instrument.lotsize;

    p.value('psize', psize);
    p.value('plbooked', bookedPL);
    p.value('plunbooked', unBookedPL);
    //event.target.style.pointerEvents = 'none';
    //event.target.style.opacity = '0.5';
  }
}
function updateOrder(response)
{
  
}
class Position
{
  #pRow; 
  #m = {expiry: [0, 0, 's'],
    strike: [1, 0, 'n'],
    right: [2, 0, 's'],
    delta: [3, 0, 'n'],
    price: [4, 0, 'n'],
    psize: [5, 0, 'n'],
    plbooked: [6, 0, 'n'],
    plunbooked: [7, 0, 'n'],
    smatch: [8, 0, 'n']
  };
  #oc;
  orders = new Array(0);
  orderN = 0;
  symbol;

  constructor(symbol)
  {
    this.symbol = symbol;
    this.#pRow = addRow(symbol);
    
    var plength = symbol.startsWith('CRUDE') ? -4 : -5;
    this.value('expiry', symbol.slice(plength - 9, plength - 2));
    this.value('strike', symbol.slice(plength - 2, -2));
    this.value('right', symbol.slice(-2) === 'CE' ? 'Call' : 'Put');
    this.value('psize', 0);

    this.#pRow.style.display = "table-row";
    this.#oc = OptionChain.get(symbol.substring(5,12));
    positions.push(this);
  }

  value(p, v = undefined){
    var i = Object.getOwnPropertyDescriptor(this.#m, p).value;
    if(v != undefined)
      this.#pRow.cells[i[0]].childNodes[i[1]].innerText = v;
    return this.#pRow.cells[i[0]].childNodes[i[1]].innerText;
  }

  order(action, osize, lmtprice)
  {
    osize = (action === 'BUY' ? 1 : -1) * Number(osize);
    var type = Number(lmtprice) > 0 ? 'LIMIT' : 'MARKET';
    var lp = action === 'BUY' ? 1 : 1000;
    var exc = instrument.exc;

    var order = {
      orderN: this.orderN + 1, action: action, quantity: osize, price: Number(lp),
          time: Date.now(), state: 'opened', counter: ordercounter++, type: 'LIMIT',
        exc: exc, symbol: this. symbol};
    this.orders.push(order);
    this.orderN = this.orderN + 1;

    if (mode === 'L')
      emit('order', order);
    else
      order.state = accepted;
  }

  findorders(state)
  {
    return this.orders.filter((e) => {
      return e.state === state;
    });
  }

  exit(){
    var psize = Number(this.value('psize')); 
    this.order(psize < 0 ? 'Sell' : 'Buy', psize);
  } 

  static findPositionRow(symbol)
  {
    return positions.find((e) =>
    {
      return symbol === e.#pRow.title;
    });
  }
}