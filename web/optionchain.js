class OptionChain
{
  expiry;
  #h_oc_div;
  h_call_tbl;
  h_put_tbl;
  atm = 0;
  pMap = new Map();
  hl_symbol = new Array(0);
  p_changed = true;
  atm_changed = true;

  constructor(expiry, v_oc_id)
  {
    this.#h_oc_div = document.getElementById(v_oc_id);
    const tbls = Array.from(this.#h_oc_div.querySelectorAll('table'));
    this.#buildHTMLOC(tbls)
    
    this.expiry = expiry;
    optionChains.push(this);
    
    qBox.addEventListener('strikex', this);
    qBox.addEventListener('index', (event) => {
      const q = event.detail;
      const atm_move = q.ltp - this.atm;

      if(Math.abs(atm_move) > 50) {
        const atm_shift = Math.round(atm_move/50);
        this.atm = this.atm + atm_shift * 50;
        this.atm_changed = true;
      }
    }); 
    
    pBox.addEventListener('position', ((e) => {
        this.p_changed = true;
        this.pMap.set(e.detail.symbol ,{psize: e.detail.unbookedQ});
      })
    );
  }

  #buildHTMLOC(tbls)
  {    
    [this.h_call_tbl, this.h_put_tbl] = tbls;

    tbls.forEach((tb, idx) => {
      for(var i = 0; i < lscount; i++)
      {
        var css = idx === 0 ? 'tr_straight' : 'tr_reverse';
        var new_tr = tRow(t_option_chain_row);
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

    const isCE = q.right === 'Call';
    var offset = (this.atm - Number(q.strike_price)) / 50;
    offset = Math.round(offset) * (isCE ? -1 : 1);
    
    if(offset >= -1 && offset < lscount-1)
   {
      const rIdx = isCE ? offset + 1 : lscount - 2 - offset;
      const tbl = isCE ? this.h_call_tbl : this.h_put_tbl;
      
      this.#rowfill_1(rIdx, q, tbl); 
      if(this.p_changed) 
        this.#rowfill_2(rIdx, q, tbl); 
      this.#rowfill_3(rIdx, q, tbl); 
    }
  }

  #rowfill_1(rIdx, q, tbl)
  {
    const row = tbl.rows[rIdx];
    row.cells[2].innerText = q.ltp.toFixed(2);

    if(row.title !== q.symbol)
      row.title = q.symbol;
        
    if(row.cells[3].childNodes[3].innerText !== q.strike_price)
      row.cells[3].childNodes[3].innerText = q.strike_price;

    const should_hl = this.hl_symbol.includes(q.symbol);
    if(should_hl && !row.classList.contains('row_background'))
      row.classList.add('row_background');
    else if(!should_hl && row.classList.contains('row_background'))
      row.classList.remove('row_background');
  }

  #rowfill_2(rIdx, q, tbl)
  {
    this.p_changed = false;
    const row = tbl.rows[rIdx];
    const unbookedQ = this.pMap.get(q.symbol);
    const psize = unbookedQ !== undefined ? unbookedQ.psize : '';
    
    const icn = row.cells[3].childNodes[1];
    if(icn.innerText !== psize) {
      icn.innerText = psize;
      icn.classList.remove('buy', 'sell');
      if(psize !== '')
        icn.classList.add((Number(psize) > 0 ? 'buy' : 'sell'));      
    }
  }

  #rowfill_3(rIdx, q, tbl)
  {
    const row = tbl.rows[rIdx];
    
    if(row.cells[0].innerText !== q.iv.toFixed(2))
      row.cells[0].innerText = q.iv.toFixed(2);
    
    if(row.cells[1].innerText !== q.delta.toFixed(2))
      row.cells[1].innerText = q.delta.toFixed(2);
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