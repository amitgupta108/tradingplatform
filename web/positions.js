class Position
{
  #m = {scrip: [1, 0, 's'],
    bookedQ: [3, 0, 'n'],
    bookedPL: [4, 0, 'n'],
    averageP: [5, 0, 'n'],
    LTP: [6, 0, 'n'],
    unbookedQ: [7, 0, 'n'],
    unbookedPL: [8, 0, 'n'],
    totalPL: [9, 1, 'n'],
    symbol: [9, 5, 'n']
  };
  raisedorders = new Array(0);
  revertedorders = new Array(0);
  #pRow;
  orderN = 0;
  symbol;

  constructor(symbol)
  {
    this.symbol = symbol;
    this.#pRow = addPositionRow(symbol);
    this.value('symbol', symbol);
    positions.push(this);
    qBox.addEventListener('strikex', this);
  }

  handleEvent(event)
  {
    if(this.value('scrip') === undefined || this.value('scrip') === '')
      return;

    var q = event.detail;
    if(q.symbol !== this.symbol || Number(this.value('unbookedQ')) === 0)
      return;

    var prevQ = Number(this.value('LTP'));
    this.value('LTP', (q.close).toFixed(2));
    
    var prevPL = Number(this.value('unbookedPL'));
    var psize = Number(this.value('unbookedQ'));
    var unbookedPL = prevPL + (q.close - prevQ) * psize;
    var totalPL = unbookedPL + Number(this.value('bookedPL'));

    this.value('unbookedPL', unbookedPL.toFixed(2));
    this.value('totalPL', totalPL.toFixed(2));
    
    writeProfitLoss();
  }

  value(p, v = undefined){
    var i = Object.getOwnPropertyDescriptor(this.#m, p).value;
    if(v != undefined)
      this.#pRow.cells[i[0]].childNodes[i[1]].innerText = v;
    return this.#pRow.cells[i[0]].childNodes[i[1]].innerText;
  }

  orderlist(neworder)
  {
    neworder.orderN = ++this.orderN;
    this.raisedorders.push(neworder);
    return neworder;
  }

  orderupdate(exorder)
  {
    console.log('Reverted Order: ' + JSON.stringify(exorder));

    this.revertedorders.push(exorder);
    this.pnlUpdate(exorder);
  }

  pnlUpdate(lastorder) 
  {  
    var buyq = 0; var sellq = 0;
    var buyv = 0; var sellv = 0;
    
    this.revertedorders.forEach((o)  => {
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
    var bookedPL = 0;
    var unbookedPL = 0;
    var price = Number(lastorder.pricedAt);

    bookedPL = (asp - abp) * Math.min(buyq, sellq);
    unbookedPL = psize * (psize > 0 ? price - abp : asp - price);
    
    var totalPL = bookedPL + unbookedPL;
    var avgopnpr =  psize === 0 ? 0 : psize > 0 ? abp : asp;

    var scrip = symtoinstrument(lastorder.symbol);
    this.value('scrip', scrip.expiry + ' ' 
          + scrip.strike + ' ' + (scrip.right === 'CE' ? 'Call' : 'Put'));
    this.value('bookedQ', Math.min(sellq, buyq));
    this.value('bookedPL', bookedPL.toFixed(2));
    this.value('averageP', avgopnpr.toFixed(2));
    this.value('LTP', price.toFixed(2));
    this.value('unbookedQ', psize);
    this.value('unbookedPL', unbookedPL.toFixed(2));
    this.value('totalPL', totalPL.toFixed(2));
    this.#pRow.style.display = 'table-row';
    writeProfitLoss();
  }

  static findPositionRow(symbol)
  {
    return positions.find((e) => symbol === e.#pRow.title);
  }
}