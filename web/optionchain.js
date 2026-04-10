class OptionChain
{
  #m = {iv: [0, 0],
    delta: [1, 0],
    price: [2, 0],
    icon:[3, 1],
    strike:[3, 3],
    sym: [3, 6],
  };
  #expiry;
  #tblBody;
  atm;
  qMap;

  constructor(expiry, tblBody)
  {
    this.#tblBody = tblBody;
    this.#expiry = expiry;
    this.#buildHTMLOC(this.#tblBody)
    
    this.qMap = new Map();
    optionChains.push(this);

    qBox.addEventListener('strikex', this);
    qBox.addEventListener('index', (event) => {
      this.atm = Math.round(event.detail.close / 50) * 50;
    });
  }

  #buildHTMLOC(tblBody)
  {
    const oTblBody = document.getElementById(tblBody);
    const template = document.getElementById('option-chain-row');
    
    for(var i = 0; i < lscount; i++)
    {
      var tContent = document.importNode(template.content, true);
      var newtr = tContent.querySelector('tr');
      oTblBody.append(newtr);
    }
  }

  handleEvent(event)
  {
    var q = event.detail;

    if(q.expiry_date !== this.#expiry)
      return;
    this.qMap.set(q.symbol, q);

    var offset = Math.abs((this.atm - Number(q.strike_price)) / 50);
    if(offset >= 0 && offset < lscount) {
      var rIdx = q.right === 'Put' ? lscount - 1 - offset: offset;
      this.#rowfill(rIdx, q); 
    }
  }

  #rowfill(rIdx, q)
  {
    const rg = q.right;
    this.value(rIdx, 'iv', rg, q.iv.toFixed(2));
    this.value(rIdx, 'delta', rg, q.delta.toFixed(2));
    this.value(rIdx, 'price', rg, q.close.toFixed(2));
    this.value(rIdx, 'strike', rg, q.strike_price);
    this.value(rIdx, 'sym', rg, q.symbol);
    
    var p = Position.findPositionRow(q.symbol);
    if(p != undefined && p.value('unbookedQ') != 0)
      this.value(rIdx, 'icon', rg, p.value('unbookedQ'), 1);
    else
      this.value(rIdx, 'icon', rg, '');
  }

  value(rIdx, p, rg, nv = undefined, css = undefined)
  {
    var i = Object.getOwnPropertyDescriptor(this.#m, p).value;
    var ci = Math.abs(i[0] + (rg === 'Call' ? 0 : -7));

    const row = document.querySelector(`#${this.#tblBody} tr:nth-child(${rIdx+1})`);
    if(nv === undefined)
      return row.cells[ci].childNodes[i[1]].innerText;
    else
    {      
      row.cells[ci].childNodes[i[1]].innerText = nv;
      if(css === 1)
      {
        row.cells[ci].childNodes[i[1]].classList.remove(p, (nv > 0 ? 'sell' : 'buy'));
        row.cells[ci].childNodes[i[1]].classList.add(p, (nv > 0 ? 'buy' : 'sell'));
      }
      return nv;
    }
  }

  static get(expiry)
  {
    return optionChains.find((o) => {
      return o.#expiry === expiry;
    });
  }
}