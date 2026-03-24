function writeProfitLoss()
{  
  let bookedPL = 0;
  let unbookedPL = 0;

  for (let i = 0; i < positions.length ; i++)
  {
    bookedPL += Number(positions[i].value('bookedPL'));
    unbookedPL += Number(positions[i].value('unbookedPL')); 
  }

  document.getElementById("vBookedPL").innerText = bookedPL.toFixed(2);
  document.getElementById("vUnbookedPL").innerText = unbookedPL.toFixed(2);
  document.getElementById("vTotalPL").innerText = (bookedPL + unbookedPL).toFixed(2);
}

function setPositionQuote(q) 
{
  var p = Position.findPositionRow(q.symbol);
  if (p != undefined)
  {
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
        else if(o.quantity < 0)
        {
          sellq += o.quantity;
          sellv += o.quantity * o.price;
        }
      }
    });

    var abp = buyv / (buyq === 0 ? 1 : buyq);
    var asp = sellv / (sellq === 0 ? 1 : sellq);
    var psize = buyq + sellq;
    var bookedPL = 0;
    var unbookedPL = 0;

    if(psize === 0) {
      bookedPL = (sellv - buyv);
      unbookedPL = 0;
    }
    else if (psize > 0) {
      bookedPL = (asp - abp) * sellq * instrument.lotsize;
      unbookedPL = (q.close - abp) * psize * instrument.lotsize;
    }
    else {
      bookedPL = (asp - abp) * buyq * instrument.lotsize;
      unbookedPL = (asp - q.close) * psize * instrument.lotsize;
    }
    
    var totalPL = bookedPL + unbookedPL;
    var avgopnpr =  psize === 0 ? 0 : psize > 0 ? abp : asp;

    p.value('bookedPL', bookedPL.toFixed(2));
    p.value('averageP', avgopnpr.toFixed(2));
    p.value('LTP', q.close);

    p.value('unbookedQ', psize);
    p.value('unbookedPL', unbookedPL.toFixed(2));
    p.value('totalPL', totalPL.toFixed(2));
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
    bookedQ: [3, 0, 'n'],
    bookedPL: [4, 0, 'n'],
    averageP: [5, 0, 'n'],
    LTP: [6, 0, 'n'],
    unbookedQ: [7, 0, 'n'],
    unbookedPL: [8, 0, 'n'],
    totalPL: [9, 0, 'n']
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
    var lp = action === 'BUY' ? 1 : 5000;
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
    var psize = Number(this.value('unbookedQ')); 
    if(psize != 0)
      this.order(psize < 0 ? 'BUY' : 'SELL', psize, -1);      
  } 

  static findPositionRow(symbol)
  {
    return positions.find((e) =>
    {
      return symbol === e.#pRow.title;
    });
  }
}