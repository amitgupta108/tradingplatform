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
  orders = new Map();
  #pRow;
  orderN = 0;
  symbol;

  constructor(symbol)
  {
    this.symbol = symbol;
    positions.push(this);
  }

  handleEvent(event)
  {
    var q = event.detail;
    if(q.symbol !== this.symbol)
      return; 
    
    const psize = Number(this.value('unbookedQ'));
    const avgP = Number(this.value('averageP'));
    this.value('LTP', (q.close).toFixed(2));

    var unbookedPL = (q.close - avgP) * psize;
    var totalPL = unbookedPL + Number(this.value('bookedPL'));

    this.value('unbookedPL', unbookedPL.toFixed(2));
    this.value('totalPL', totalPL.toFixed(2));

    writeProfitLoss();
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

  ini(symbol, recovery)
  {
    if(this.#pRow === undefined)
    {
      this.#pRow = tRow(t_position_table_row, true);
      this.#pRow.title = symbol;
      this.#pRow.querySelector('#orderdisplay-btn').title = symbol;
      document.getElementById('positions_tbody').append(this.#pRow);

      this.value('scrip', symtoinstrument(symbol).name);
      qBox.addEventListener('strikex', this);
    }
  }

  orderupdate(exorder, recovery)
  {
    this.ini(exorder.symbol, recovery);
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
    var psize = buyq - sellq;
    var bookedPL = 0; var unbookedPL = 0;
    var price = Number(lastorder.pricedAt);

    bookedPL = (asp - abp) * Math.min(buyq, sellq);
    unbookedPL = Math.abs(psize) * (psize > 0 ? price - abp : asp - price);
    
    var totalPL = bookedPL + unbookedPL;
    var avgopnpr =  psize === 0 ? 0 : psize > 0 ? abp : asp;

    this.#pRow.querySelector('#pos_exit_cb').disabled = psize === 0 || psize === '' ? true : false;

    this.value('bookedQ', Math.min(sellq, buyq));
    this.value('bookedPL', bookedPL.toFixed(2));
    this.value('averageP', avgopnpr.toFixed(2));
    this.value('LTP', price.toFixed(2));
    this.value('unbookedQ', psize);
    this.value('unbookedPL', unbookedPL.toFixed(2));
    this.value('totalPL', totalPL.toFixed(2));
    this.#pRow.style.display = 'table-row';
    pBox.dispatchEvent(generateEvent('position', {symbol: this.symbol, unbookedQ: psize}));
    writeProfitLoss();
  }

  static findPosition(symbol, newp)
  {
    var p = positions.find((e) => symbol === e.symbol);
    if(p === undefined && newp)
      p = new Position(symbol);
    return p;
  }
}