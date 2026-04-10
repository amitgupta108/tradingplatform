function writeProfitLoss()
{  
  let bookedPL = 0; let unbookedPL = 0;

  for (let i = 0; i < positions.length ; i++)
  {
    bookedPL += Number(positions[i].value('bookedPL'));
    unbookedPL += Number(positions[i].value('unbookedPL')); 
  }

  document.getElementById("vBookedPL").innerText = bookedPL.toFixed(2);
  document.getElementById("vUnbookedPL").innerText = unbookedPL.toFixed(2);
  document.getElementById("vTotalPL").innerText = (bookedPL + unbookedPL).toFixed(2);
}

function loadPositions(ps)
{
  ps.forEach(element => {
    if(symtoinstrument(element.symbol).stockCode === instrument.stockCode)
    {
      var p = new Position(element.symbol);
      p.orders = [{
        orderN: 1,
        symbol: element.symbol,
        price: element.average_price,
        quantity: element.quantity,
      }];
      p.orderN = 1;
      refreshPositionPL(p, element.ltp);
    }
  });
}

class Position
{
  #pRow; 
  #m = {expiry: [0, 0, 's'],
    strike: [1, 0, 'n'],
    right: [2, 0, 's'],
    bookedQ: [3, 0, 'n'],
    bookedPL: [4, 1, 'n'],
    averageP: [5, 0, 'n'],
    LTP: [6, 0, 'n'],
    unbookedQ: [7, 0, 'n'],
    unbookedPL: [8, 0, 'n'],
    totalPL: [9, 1, 'n']
  };
  orders = new Array(0);
  orderN = 0;
  symbol;

  constructor(symbol)
  {
    this.symbol = symbol;
    this.#pRow = addRow(symbol);
    
    var scrip = symtoinstrument(symbol);
    this.value('expiry', scrip.expiry);
    this.value('strike', scrip.strike);
    this.value('right', scrip.right === 'CE' ? 'Call' : 'Put');

    this.#pRow.style.display = "table-row";
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

    this.value('unbookedPL', (prevPL + (q.close - prevQ) * psize).toFixed(2));
    this.value('totalPL', Number(this.value('unbookedPL')) + Number(this.value('bookedPL')).toFixed(2));
    
    writeProfitLoss();
  }

  value(p, v = undefined){
    var i = Object.getOwnPropertyDescriptor(this.#m, p).value;
    if(v != undefined)
      this.#pRow.cells[i[0]].childNodes[i[1]].innerText = v;
    return this.#pRow.cells[i[0]].childNodes[i[1]].innerText;
  }

  order(neworder)
  {
    neworder.stockCode = instrument.stockCode;
    neworder.orderN = ++this.orderN;
    neworder.time = Date.now();
    neworder.state = 'opened';

    this.orders.push(neworder);
    emit('order', neworder);
  }

  orderupdate(exorder){
    var o = this.orders.find((e) => e.orderid === exorder.orderid);
    if(exorder.order_status === 'complete')
    {
      o.state = 'completed';
      o.price = exorder.average_price;
      o.extime = exorder.timestamp;
      o.filled_q = exorder.filled_q * (o.action === 'BUY' ? 1 : -1);
      this.pnlUpdate();
    }
    else if(['modified'].includes(exorder.order_status) )
    {
      o.state = exorder.order_status;
      o.type = exorder.prcTp === 'L' ? 'LIMIT' : 'MARKET';
      o.price = Number(exorder.prc)
    }
    else if(['open', 'rejected', 'cancelled'].includes(exorder.order_status) )
      o.state = exorder.order_status === 'open'? 'opened' : exorder.order_status;
    else
      console.log('matched order state ignored ' + exorder.orderid + ' ' + exorder.order_status);
  }

  wsorderupdate(ordermsg){
    var o = this.orders.find((e) => e.orderid === ordermsg.nOrdNo);
    if(o === undefined) {
      console.log('unmatched order Id' + ordermsg.nOrdNo + ' ' + ordermsg.ordSt);
      return;
    }
    
    if(ordermsg.ordSt === 'complete')
    {
      o.state = 'completed';
      o.price = Number(ordermsg.avgPrc);
      o.extime = ordermsg.exCfmTm;
      o.filled_q = Number(ordermsg.fldQty) * (o.action === 'BUY' ? 1 : -1);
      o.unfilled_q = ordermsg.unFldSz;
      this.pnlUpdate();
    }
    else if(['open', 'rejected', 'cancelled'].includes(ordermsg.ordSt))
    {
      o.state = ordermsg.ordSt;
    }
    else if(ordermsg.ordSt === 'modified')
    {
      o.state = ordermsg.ordSt;
      o.quantity = ordermsg.qty;
      o.type = ordermsg.prcTp === 'L' ? 'LIMIT' : 'MARKET';
      o.price = Number(ordermsg.prc)
    }
    else //unmapped status from kotak - open
      console.log('matched order state ignored ' + ordermsg.nOrdNo + ' ' + ordermsg.ordSt);
  }
  
  pnlUpdate() 
  {
    var buyq = 0; var sellq = 0;
    var buyv = 0; var sellv = 0;
    
    this.orders.map((o) => 
    {  
      if(o.state === 'completed')
      {
        if(o.quantity > 0)
        {
          buyq += Number(o.filled_q);
          buyv += Number(o.filled_q) * Number(o.price);
        }  
        else if(o.quantity < 0)
        {
          sellq += Number(o.filled_q);
          sellv += Number(o.filled_q) * Number(o.price);
        }
      }
    });

    var abp = Number(buyv / (buyq === 0 ? 1 : buyq).toFixed(2));
    var asp = Number(sellv / (sellq === 0 ? 1 : sellq).toFixed(2));
    var psize = buyq + sellq;
    var bookedPL = 0;
    var unbookedPL = 0;
    var price = Number(this.orders.at(-1).price);

    if(psize === 0) {
      bookedPL = (Math.abs(sellv) - buyv);
      unbookedPL = 0;
    }
    else if (psize > 0) {
      bookedPL = (asp - abp) * sellq;
      unbookedPL = (price - abp) * Math.abs(psize);
    }
    else {
      bookedPL = (asp - abp) * buyq;
      unbookedPL = (asp - price) * Math.abs(psize);
    }
    
    var totalPL = bookedPL + unbookedPL;
    var avgopnpr =  psize === 0 ? 0 : psize > 0 ? abp : asp;

    this.value('bookedQ', Math.min(Math.abs(sellq), buyq));
    this.value('bookedPL', bookedPL.toFixed(2));
    this.value('averageP', avgopnpr.toFixed(2));
    this.value('LTP', price);
    this.value('unbookedQ', psize);
    this.value('unbookedPL', unbookedPL.toFixed(2));
    this.value('totalPL', totalPL);

    writeProfitLoss();
  }

  static findPositionRow(symbol)
  {
    return positions.find((e) =>
    {
      return symbol === e.#pRow.title;
    });
  }
}