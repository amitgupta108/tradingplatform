class OptionChain
{
  expiry;
  h_call_tbl;
  h_put_tbl;
  atm = 0;
  row_map = new Map();
  u_price = 0;
  lscount = instrument.lscount;

  constructor(expiry, v_oc_id)
  {
    this.expiry = expiry;
    this.#buildHTMLOC(v_oc_id);
    
    optionChains.push(this);
    qBox.addEventListener('strikex', this);
    
    qBox.addEventListener('futures', (event) => {
      this.handleUnderlying(event.detail);
    }); 
    
    pBox.addEventListener('position', (event) => {
        const symbol = event.detail.symbol;
        const unbookedQ = event.detail.unbookedQ;
        const r = this.row_map.get(symbol);
        if(r !== undefined) {
          r.psize = unbookedQ;
          r.row.cells[2].childNodes[1].textContent = unbookedQ;
          r.row.cells[2].childNodes[1].classList.remove('buy', 'sell');
          
          if(!(unbookedQ === '' || unbookedQ === 0))
            r.row.cells[2].childNodes[1].classList.add((Number(unbookedQ) > 0 ? 'buy' : 'sell'));
      }
    });
  }

  #buildHTMLOC(v_oc_id)
  {    
    const h_oc_div = document.getElementById(v_oc_id);
    const tbls = Array.from(h_oc_div.querySelectorAll('table'));
    [this.h_call_tbl, this.h_put_tbl] = tbls;

    for(var i = 0; i < lscount; i++)
    {
      var new_tr_c = tRow(t_option_chain_row);
      var new_tr_p = tRow(t_option_chain_row);
      new_tr_c.classList.add('tr_straight');
      new_tr_p.classList.add('tr_reverse');
      
      tbls[0].append(new_tr_c);
      tbls[1].append(new_tr_p);
    }
  }

  handleEvent(event)
  {
    var q = event.detail;
    if(q === undefined || q.expiry_date !== this.expiry)
      return;

    const r = this.row_map.get(q.symbol);
    const offset = (Number(q.strike_price) - this.atm) / 50;

    if(r !== undefined && (q.right === 'PE' && offset <= 1 && offset >= 2 - lscount || 
      q.right === 'CE' && offset >= -1 && offset <= lscount - 2))
    {   
      r.row.cells[1].textContent = q.ltp.toFixed(2);
      
      q = addIVNDelta(q, this.u_price);
      
      if(Math.abs(Number(r.row.cells[0].textContent) - q.delta) > 0.5)
        r.row.cells[0].textContent = q.delta.toFixed(2);
    }
  }

  handleUnderlying(q)
  {
    this.u_price = q.ltp;
    const atm_move = q.ltp - this.atm;

    if(Math.abs(atm_move) > 50) {
      const atm_shift = Math.round(atm_move/50);
      this.atm = this.atm + atm_shift * 50;
      this.atm_reset();
    }
  }

  atm_reset()
  {
    const size = this.row_map.size;  
    for(var i = 0; i < lscount * 2; i++)
    {
      const cg = i < lscount ? 
        {right: 'CE', sign: 1, idx: i, offset: i - 1, tbl: this.h_call_tbl} : 
        {right: 'PE', sign: -1, idx: i - lscount, offset: 2 * lscount - i - 2, tbl: this.h_put_tbl};

      const strike = this.atm + (cg.offset * cg.sign) * 50;
      const symbol = instrument.stockCode + this.expiry + strike + cg.right;
      
      cg.tbl.rows[cg.idx].title = symbol;
      cg.tbl.rows[cg.idx].cells[2].childNodes[3].textContent = strike;

      const r = this.row_map.get(symbol);
      if(size === 0 || r === undefined)
        this.row_map.set(symbol, {row: cg.tbl.rows[cg.idx]});
      else { 
        if(r.hl === true) {
          r.row.classList.remove('row_background');
          cg.tbl.rows[cg.idx].classList.add('row_background');
        }
        if(r.psize !== undefined && r.psize !== '') {
          cg.tbl.rows[cg.idx].cells[2].childNodes[1].textContent = r.psize;
          cg.tbl.rows[cg.idx].cells[2].childNodes[1].classList.add((Number(r.psize) > 0 ? 'buy' : 'sell'));
          r.row.cells[2].childNodes[1].textContent = '';
          r.row.cells[2].childNodes[1].classList.remove('buy', 'sell');
        }
        r.row = cg.tbl.rows[cg.idx];
      }
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