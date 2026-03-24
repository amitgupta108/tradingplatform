class OptionChain
{
  #m = {iv: [0, 0],
    delta: [1, 0],
    price: [2, 0],
    strike:[3, 3],
    icon:[3, 1],
    sym: [3, 6],
  };
  #expiry;
  #r;
  #icons = new Array(0);
  #aiv = [0,0];
  atm = 25000;
  oc;

  constructor(expiry, tblBody)
  {
    this.oc = document.getElementById(tblBody);
    this.#r = Array.from(createOCTable(this.oc, lscount));
    this.#expiry = expiry;
  }

  static get(expiry)
  {
    return optionChains.find((o) => {
      return o.#expiry.substring(0,2) === expiry.substring(0,2)
    });
  }

  static update(q)
  {
    var chain = this.get(q.expiry_date);
    chain.q(q);
  }

  q(q)
  {     
    var offset = (this.atm - q.strike_price) / 50;
    var n = 0;
    if(offset > 0)
      n = lscount - offset-1;
    else if (offset < 0)
      n = offset * -1;
    else 
      if (q.right === 'Put')
        n = lscount-1;
      else
        n = 0;

    this.#rowfill(n, q, q.right);
  }

  fill(q)
  {
    this.#rst();
  }

  #rst(){
    for( var i = 0; i < this.#icons.length; i++)
    {
      var nr = Math.abs((this.#icons[i].s - this.#value(0, 'strike', this.#icons[i].rg)) / 50);
      if(nr < this.#r.length)
        this.#value(nr, this.#icons[i].a, this.#icons[i].rg, this.#icons[i].q);
    }
  }

  #rowfill(n, q, rg)
  {
    if(q != undefined)
    {
      this.#value(n, 'iv', rg, q.iv);
      this.#value(n, 'delta', rg, q.delta);
      this.#value(n, 'price', rg, q.close);
      this.#value(n, 'strike', rg, q.strike_price);
      this.#value(n, 'sym', rg, q.symbol);
    }
    var p = Position.findPositionRow(q.symbol);
    if(p != undefined && p.psize != 0)
      this.#value(n, 'icon', rg, p.value('unbookedQ'), rg);
    else
      this.#value(n, 'icon', rg, '');
  }
  
  icon(sy, a, q)
  { 
    this.#icons.push(new Icon(sy, a, q));

    var r = Math.abs((s - this.#value(0, 'strike', rg)) / 50);
    this.#value(r, a, rg, q);
  }

  #value(n, p, rg, nv = undefined)
  {
    var i = Object.getOwnPropertyDescriptor(this.#m, p).value;
    var ci = Math.abs(i[0] + (rg === 'Call' ? 0 : -7));

    if(nv === undefined)
      return this.#r[n].cells[ci].childNodes[i[1]].innerText;
    else
    {      
      this.#r[n].cells[ci].childNodes[i[1]].innerText = nv;
      return nv;
    }
  }
}

class Icon
{
  constructor(sy, a, q)
  {
    this.sy = sy;
    this.a = a;
    this.q = q;
  }
  sy;
  a;
  q;
}