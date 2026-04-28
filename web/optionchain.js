class OptionChain
{
  #expiry;
  #v_oc_id;
  atm;
  pMap;

  constructor(expiry, v_oc_id)
  {
    this.#v_oc_id = v_oc_id;
    this.#expiry = expiry;
    this.#buildHTMLOC(this.#v_oc_id)
    
    optionChains.push(this);

    qBox.addEventListener('strikex', this);
    
    qBox.addEventListener('index', (event) => {
      const q = event.detail;

      if(this.atm === undefined)
        this.atm = Math.round(q.close/50) * 50;
      else if(Math.abs(this.atm - q.close) > 50)
        this.atm = this.atm + Math.round((q.close - this.atm) / 50) * 50;
    });
    
    this.pMap = new Map();
    pBox.addEventListener('position', ((e) => {
      this.pMap.set(e.detail.symbol ,{psize: e.detail.unbookedQ});
    } ));
  }

  #buildHTMLOC(v_oc_id)
  {    
    const tBodies = Array.from(h_oc_div.querySelectorAll('tbody'));

    tBodies.forEach((tb, idx) => {
      const t_row = idx === 0 ? t_option_chain_call_row : t_option_chain_put_row;
      for(var i = 0; i < lscount; i++)
      {
        var new_tr = tRow(t_row, false);
        new_tr.addEventListener('click', (event) => {
          orderWindow(event);
        }, true);
        
        tb.append(new_tr);
      }
    });
  }

  handleEvent(event)
  {
    var q = event.detail;

    if(q.expiry_date !== this.#expiry)
      return;

    var offset = (this.atm - Number(q.strike_price)) / 50;
    offset = offset * (q.right === 'Call' ? -1 : 1);
    if(offset >= -1 && offset < lscount-1) {
      var rIdx = q.right === 'Put' ? lscount - 2 - offset: offset + 1;
      this.#rowfill(rIdx, q); 
    }
  }

  #rowfill(rIdx, q)
  {
    const idx = q.right === 'Call' ? 0 : 1;
    const cIdx = q.right === 'Call' ? [0, 1, 2, 3] : [3, 2, 1, 0];
    const tbody = Array.from(h_oc_div.querySelectorAll('tbody'))[idx];

    const row = tbody.rows[rIdx];
    row.title = q.symbol;
    row.cells[cIdx[0]].innerText = q.iv.toFixed(2);
    row.cells[cIdx[1]].innerText = q.delta.toFixed(2);
    row.cells[cIdx[2]].innerText = q.close.toFixed(2);
    row.cells[cIdx[3]].childNodes[3].innerText = q.strike_price;

    const unbookedQ = this.pMap.get(q.symbol);
    if(unbookedQ === undefined || unbookedQ.psize === 0 || unbookedQ.psize === '') {
      row.cells[cIdx[3]].childNodes[1].innerText = '';
      //row.cells[cIdx[3]].childNodes[1].classList.toggle();
    }
    else {
      const psize = unbookedQ.psize;
      row.cells[cIdx[3]].childNodes[1].innerText = psize;
    
      row.cells[cIdx[3]].childNodes[1].classList.remove((psize > 0 ? 'sell' : 'buy'));
      row.cells[cIdx[3]].childNodes[1].classList.add((psize > 0 ? 'buy' : 'sell'));
    }
  }

  static get(expiry)
  {
    return optionChains.find((o) => {
      return o.#expiry === expiry;
    });
  }
}