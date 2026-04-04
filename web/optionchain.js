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
  #r;
  #aiv = [0,0];
  atm;
  oc;

  constructor(expiry, tblBody)
  {
    this.oc = document.getElementById(tblBody);
    this.#r = Array.from(createOCTable(this.oc, lscount + addrows));
    this.#expiry = expiry;
  }

  static get(expiry)
  {
    return optionChains.find((o) => {
      return o.#expiry === expiry;
    });
  }

  static update(q)
  {
    var chain = this.get(q.expiry_date);
    chain.q(q);
  }

  q(q)
  {     
    var offset = (this.atm - Number(q.strike_price)) / 50;

    var n = 0;
    if(q.right === 'Put' && (offset <= lscount + addrows/2) && offset >= (-1 * addrows/2))
      n = lscount + addrows/2 - 1 - offset;
    else if (q.right === 'Call' && (offset > -1 * (lscount + addrows/2)) && offset <= addrows/2)
      n = (offset * -1) + addrows/2;
    
    this.#rowfill(n, q, q.right);
  }

  #rowfill(n, q, rg)
  {

    this.#value(n, 'iv', rg, q.iv);
    this.#value(n, 'delta', rg, q.delta);
    this.#value(n, 'price', rg, q.close.toFixed(2));
    this.#value(n, 'strike', rg, q.strike_price);
    this.#value(n, 'sym', rg, q.symbol);

    var p = Position.findPositionRow(q.symbol);
    if(p != undefined && p.value('unbookedQ') != 0)
      this.#value(n, 'icon', rg, p.value('unbookedQ'), 1);
    else
      this.#value(n, 'icon', rg, '');
  }

  #value(n, p, rg, nv = undefined, css = undefined)
  {
    var i = Object.getOwnPropertyDescriptor(this.#m, p).value;
    var ci = Math.abs(i[0] + (rg === 'Call' ? 0 : -7));

    if(nv === undefined)
      return this.#r[n].cells[ci].childNodes[i[1]].innerText;
    else
    {      
      this.#r[n].cells[ci].childNodes[i[1]].innerText = nv;
      if(css === 1)
      {
        this.#r[n].cells[ci].childNodes[i[1]].classList.remove(p, (nv > 0 ? 'sell' : 'buy'));
        this.#r[n].cells[ci].childNodes[i[1]].classList.add(p, (nv > 0 ? 'buy' : 'sell'));
      }
      return nv;
    }
  }
}