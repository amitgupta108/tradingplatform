class OptionChain
{
  expiry;
  #h_oc_div;
  atm;
  pMap = new Map();
  hl_symbol = new Array(0);

  constructor(expiry, v_oc_id)
  {
    this.#h_oc_div = document.getElementById(v_oc_id);
    this.expiry = expiry;
    this.#buildHTMLOC(this.#h_oc_div)

    optionChains.push(this);
    
    qBox.addEventListener('strikex', this);
    qBox.addEventListener('index', (event) => {
      const q = event.detail;

      if(this.atm === undefined)
        this.atm = Math.round(q.close/50) * 50;
      else if(Math.abs(this.atm - q.close) > 50)
        this.atm = this.atm + Math.round((q.close - this.atm) / 50) * 50;
    });
    
    pBox.addEventListener('position', ((e) => {
        this.pMap.set(e.detail.symbol ,{psize: e.detail.unbookedQ});
      })
    );
  }

  #buildHTMLOC(v_oc_id)
  {    
    const tbls = Array.from(this.#h_oc_div.querySelectorAll('table'));

    tbls.forEach((tb, idx) => {
      for(var i = 0; i < lscount; i++)
      {
        var new_tr = tRow(t_option_chain_row, true);
        var css = idx === 0 ? 'tr_straight' : 'tr_reverse';
        new_tr.classList.add(css);
        tb.append(new_tr);
      }
    });
  }

  handleEvent(event)
  {
    var q = event.detail;
    if(q.expiry_date !== this.expiry)
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
    const tbl_nm = q.right === 'Call' ? 'oc_call_table' : 'oc_put_table';
    const tbls = this.#h_oc_div.querySelector('#' + tbl_nm);

    const row = tbls.rows[rIdx];
    row.title = q.symbol;
    row.cells[0].innerText = q.iv.toFixed(2);
    row.cells[1].innerText = q.delta.toFixed(2);
    row.cells[2].innerText = q.close.toFixed(2);
    row.cells[3].childNodes[3].innerText = q.strike_price;

    if(this.hl_symbol.includes(q.symbol))
      row.classList.add('row_background');
    else 
      row.classList.remove('row_background');

    const unbookedQ = this.pMap.get(q.symbol);
    const icn = row.cells[3].childNodes[1];
    if(unbookedQ === undefined || unbookedQ.psize === 0 || unbookedQ.psize === '') {
      icn.innerText = '';
    }
    else {
      const psize = unbookedQ.psize;
      icn.innerText = psize;
      icn.classList.remove((psize > 0 ? 'sell' : 'buy'));
      icn.classList.add((psize > 0 ? 'buy' : 'sell'));
    }
  }

  static get(expiry)
  {
    return optionChains.find((o) => {
      return o.expiry === expiry;
    });
  }
}


if (optionChains.findIndex((oc) => oc.expiry === instrument.oExpiry) === -1)
  var c_option_chain = new OptionChain(instrument.oExpiry, 'c_oc_div');

if (optionChains.findIndex((oc) => oc.expiry === instrument.oExpiryNxt) === -1)
  var n_option_chain =  new OptionChain(instrument.oExpiryNxt, 'n_oc_div');
