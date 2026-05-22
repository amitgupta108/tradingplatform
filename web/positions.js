class Position
{
  #m = {scrip: [1, 0],
    bookedQ: [3, 0],
    bookedPL: [4, 0],
    averageP: [5, 0],
    LTP: [6, 0],
    unbookedQ: [7, 0],
    unbookedPL: [8, 0],
    totalPL: [9, 1],
  };
  booked = {pl: 0, qty: 0, avgP: 0};
  psize = 0;
  orders = new Map();
  #pRow;
  orderN = 0;
  symbol;

  constructor(symbol)
  {
    this.symbol = symbol;
    positions.push(this);
    this.ini(symbol, false);
  }

  ini(symbol, recovery)
  {
    this.#pRow = tRow(t_position_table_row);
    this.#pRow.title = symbol;
    this.#pRow.querySelector('#orderdisplay-btn').title = symbol;
    document.getElementById('positions_tbody').append(this.#pRow);

    this.value('scrip', expandSymbol(symbol).name);
    qBox.addEventListener('strikex', this);
  }

  handleEvent(event)
  {
    var q = event.detail;
    if(q.symbol !== this.symbol)
      return; 
    
    this.updateUnbookedPL(q.close);
  }

  value(p, v = undefined)
  {
    var i = Object.getOwnPropertyDescriptor(this.#m, p).value;
    if(v != undefined)
      this.#pRow.cells[i[0]].childNodes[i[1]].innerText = v;
    
    return this.#pRow.cells[i[0]].childNodes[i[1]].innerText;
  }

  orderlist(neworder)
  {
    neworder.orderN = ++this.orderN;
    neworder.action = neworder.action === 'B' ? 'BUY' : 'SELL';
    return neworder;
  }

  orderupdate(exorder, recovery)
  {
    this.orders.set(exorder.orderid, exorder);
    this.pnlUpdate(exorder);
    
    var opencount = this.orders.values().toArray().filter((o) => o.state === 'opened').length;
    var label = this.#pRow.querySelector('#orderdisplay-btn');
    label.innerText = (opencount === 0 ? 'N' : opencount);
    label.style.backgroundColor = (opencount === 0 ? 'white' : 'skyblue');
  }
  
  pnlUpdate(lastorder) 
  {  
    var buyq = 0; var sellq = 0;
    var buyv = 0; var sellv = 0;
    
    this.orders.forEach((o)  => {
      if(['complete', 'completed', 'partial'].includes(o.state))
      {
        if(o.action === 'BUY')
        {
          buyq += Number(o.filled_q);
          buyv += Number(o.filled_q) * Number(o.pricedAt);
        }  
        else
        {
          sellq += Number(o.filled_q);
          sellv += Number(o.filled_q) * Number(o.pricedAt);
        }
      }
    });

    var abp = (buyq === 0 ? 0 : buyv / buyq);
    var asp = (sellq === 0 ? 0 : sellv / sellq);
    this.psize = buyq - sellq;
    var price = Number(lastorder.pricedAt);

    this.booked.qty = Math.min(buyq, sellq);
    const new_bookedPL = ((asp - abp) * this.booked.qty);
    const bookedPLChange = (new_bookedPL) - this.booked.pl;
    this.booked.pl = new_bookedPL;
    this.booked.avgP =  this.psize === 0 ? 0 : this.psize > 0 ? abp : asp;

    this.value('bookedQ', this.booked.qty);
    this.value('bookedPL', this.booked.pl.toFixed(2));
    this.value('averageP', this.booked.avgP.toFixed(2));
    this.value('unbookedQ', this.psize);
    pBox.dispatchEvent(generateEvent('position', {symbol: this.symbol, unbookedQ: this.psize}));
    
    this.updateUnbookedPL(price, 'position', bookedPLChange);
    
    this.#pRow.querySelector('#pos_exit_cb').disabled = this.psize === 0 || this.psize === '' ? true : false;
    this.#pRow.style.display = 'table-row';
  }

  updateUnbookedPL(price, type, bookedPLChange = 0)
  {
    const unbookedPL = Number(this.value('unbookedPL'));
    const new_unbookedPL = (price - this.booked.avgP) * this.psize;
    const unbookedPLChange = new_unbookedPL - unbookedPL;
    const totalPL = Number(this.value('totalPL')) + unbookedPLChange;

    this.value('LTP', (price).toFixed(2));
    this.value('unbookedPL', new_unbookedPL.toFixed(2));
    this.value('totalPL', totalPL.toFixed(2));

    if(type !== 'quote')
      gtotal_booked.innerText = (Number(gtotal_booked.innerText) + bookedPLChange).toFixed(2);
    
    gtotal_unbooked.innerText = (Number(gtotal_unbooked.innerText) + unbookedPLChange).toFixed(2);
    gtotal_pnl.innerText = (Number(gtotal_pnl.innerText) + unbookedPLChange + bookedPLChange).toFixed(2);
  }

  static findPosition(symbol, newp)
  {
    var p = positions.find((e) => symbol === e.symbol);
    if(p === undefined && newp)
      p = new Position(symbol);
    return p;
  }
}