class OptionChain
{
  #expiry;
  #v_oc_id;
  atm;
  qMap;

  constructor(expiry, v_oc_id)
  {
    this.#v_oc_id = v_oc_id;
    this.#expiry = expiry;
    this.#buildHTMLOC(this.#v_oc_id)
    
    this.qMap = new Map();
    optionChains.push(this);

    qBox.addEventListener('strikex', this);
    qBox.addEventListener('index', (event) => {
      this.atm = Math.round(event.detail.close / 50) * 50;
    });
    pBox.addEventListener('positions', ((e) => {} ));
  }

  #buildHTMLOC(v_oc_id)
  {
    /*const t_head_row = document.getElementById('oc_header');
    const htr = document.importNode(t_head_row.content, true);
    h_oc_div.appendChild(htr);*/
    
    const tBodies = Array.from(h_oc_div.querySelectorAll('tbody'));

    tBodies.forEach((tb, idx) => {
      const t_row = idx === 0 ? t_option_chain_call_row : t_option_chain_put_row;
      for(var i = 0; i < lscount; i++)
      {
        var new_tr = tRow(t_row);
        new_tr.addEventListener('click', (event) => {
          prepareOrderWindow(event);
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
    this.qMap.set(q.symbol, q);

    var offset = (this.atm - Number(q.strike_price)) / 50;
    offset = offset * (q.right === 'Call' ? -1 : 1);
    if(offset >= 0 && offset < lscount) {
      var rIdx = q.right === 'Put' ? lscount - 1 - offset: offset;
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
    /*
    var p = Position.findPosition(q.symbol, false);
  
    const unbookedQ =  (p != undefined && p.value('unbookedQ') != 0) ? p.value('unbookedQ') : '';
    row.cells[cIdx[3]].childNodes[1].innerText =  unbookedQ;
    
    if(unbookedQ !== '') {
      row.cells[3].childNodes[1].classList.remove(p, (Number(unbookedQ) > 0 ? 'sell' : 'buy'));
      row.cells[3].childNodes[1].classList.add(p, (Number(unbookedQ) > 0 ? 'buy' : 'sell'));
    }*/
  }

  static get(expiry)
  {
    return optionChains.find((o) => {
      return o.#expiry === expiry;
    });
  }
}