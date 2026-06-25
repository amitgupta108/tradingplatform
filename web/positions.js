class Position
{
  #m = {
    bookedQ: [3, 0],
    bookedPL: [4, 0],
    averageP: [5, 0],
    LTP: [6, 0],
    unbookedQ: [7, 0],
    unbookedPL: [8, 0],
    totalPL: [9, 1],
  };
  booked = {pl: 0.00, qty: 0, avgP: 0.00};
  psize = 0;
  orders = new Map();
  #pRow;
  symbol;

  constructor(symbol)
  {
    this.symbol = symbol;
    positions.set(symbol, this);
    this.ini(symbol, false);
  }

  ini(symbol, recovery)
  {
    this.#pRow = tRow(t_position_table_row);
    this.#pRow.title = symbol;
    this.#pRow.querySelector('#orderdisplay-btn').title = symbol;
    this.#pRow.querySelector('#Instrument').textContent = expandSymbol(symbol).name;
    
    document.getElementById('positions_tbody').append(this.#pRow);
  }

  value(p, v = undefined)
  {
    var i = this.#m[p];
    const node = this.#pRow.cells[i[0]].childNodes[i[1]];
    if(v != undefined)
      node.innerText = decimal2.includes(p) ? Number(v).toFixed(2) : v;
  
    return Number(node.innerText);
  }

  orderupdate(exorder, recovery)
  {
    this.orders.set(exorder.orderid, exorder);
    if(exorder.state !== 'opened')
      this.positionUpdate(exorder);
    
    var opencount = Array.from(this.orders.values()).filter((o) => o.state === 'opened').length;
    var label = this.#pRow.querySelector('#orderdisplay-btn');
    label.innerText = (opencount === 0 ? 'N' : opencount);
    label.style.backgroundColor = (opencount === 0 ? 'white' : 'skyblue');
  }
  
  positionUpdate(lastorder) 
  {  
    var buyq = 0; var sellq = 0;
    var buyv = 0; var sellv = 0;
    
    for (const o of this.orders.values()) {
      if(['complete', 'completed'].includes(o.state))
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
    }

    var abp = (buyq === 0 ? 0 : buyv / buyq);
    var asp = (sellq === 0 ? 0 : sellv / sellq);
    this.booked.qty = Math.min(buyq, sellq);
    this.psize = buyq - sellq;
    var ltp = Number(lastorder.pricedAt);

    this.pnlUpdate(abp, asp, ltp)
    pBox.dispatchEvent(generateEvent('position', {symbol: this.symbol, unbookedQ: this.psize}));    
    this.#pRow.querySelector('#pos_exit_cb').disabled = this.psize === 0 ? true : false;
    this.#pRow.style.display = 'table-row';
  }

  pnlUpdate(abp, asp, ltp)
  {
    this.booked.pl = ((asp - abp) * this.booked.qty);
    this.booked.avgP = this.psize === 0 ? 0 : this.psize > 0 ? abp : asp;

    const new_bookedPL = this.booked.pl;
    const old_bookedPL = this.value('bookedPL');
    const b_change = new_bookedPL - old_bookedPL;

    this.value('bookedQ', this.booked.qty);
    this.value('bookedPL', this.booked.pl);
    this.value('averageP', this.booked.avgP);
    
    this.value('LTP', ltp);    
    this.value('unbookedQ', this.psize);

    const new_unbookedPL = (ltp - this.booked.avgP) * this.psize;
    const old_unbookedPL = this.value('unbookedPL');
    const unb_change = new_unbookedPL - old_unbookedPL;

    this.value('unbookedPL', new_unbookedPL);
    this.value('totalPL', new_bookedPL + new_unbookedPL);
    pNL.dispatchEvent(generateEvent('change', {change_b: b_change, change_unb: unb_change}));
  }

  static findPosition(symbol, newp)
  {
    var p = positions.get(symbol);
    if(p === undefined && newp)
      p = new Position(symbol);
    return p;
  }
}