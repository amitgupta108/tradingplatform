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
    symbol: [9, 5]
  };
  raisedorders = new Array(0);
  finalorders = new Array(0);
  transientorders = new Array(0);
  #pRow;
  orderN = 0;
  symbol;

  constructor(symbol)
  {
    this.symbol = symbol;
    this.#pRow = addPositionRow(symbol);
    this.value('symbol', symbol);
    this.value('scrip', symbol);
    positions.push(this);
    qBox.addEventListener('strikex', this);
  }

  handleEvent(event)
  {
    var q = event.detail;
    if(q.symbol !== this.symbol)
      return; 
    
    var prevQ = Number(this.value('LTP'));
    this.value('LTP', (q.close).toFixed(2));

    if(Number(this.value('unbookedQ')) === 0)
      return;    

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
    neworder.action = neworder.action === 'B' ? 'BUY' : 'SELL';
    this.raisedorders.push(neworder);
    return neworder;
  }

  orderupdate(exorder)
  {
    if(!['complete', 'completed', 'partial', 'opened', 'cancelled'].includes(exorder.state))
      this.transientorders.push(exorder);
    else
    {
      if(['opened'].includes(exorder.state))
        this.finalorders.push(exorder);
      else
      {
        var idx = this.finalorders.findIndex((o) => o.orderid === exorder.orderid);
        if(idx !== -1)
        {
          this.finalorders.splice(idx, 1, exorder);
          this.pnlUpdate(exorder);
        }
      }
      var opencount = this.finalorders.filter((o) => o.state === 'opened').length;
      this.#pRow.querySelector('#orderdisplay-btn').innerText = (opencount === 0 ? 'N' : opencount);
      this.#pRow.querySelector('#orderdisplay-btn').style.backgroundColor = (opencount === 0 ? 'white' : 'skyblue');
    }
  }

  pnlUpdate(lastorder) 
  {  
    var buyq = 0; var sellq = 0;
    var buyv = 0; var sellv = 0;
    
    this.finalorders.forEach((o)  => {
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

    this.#pRow.querySelector('#exitcb').disabled = psize === 0 ? true : false;
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