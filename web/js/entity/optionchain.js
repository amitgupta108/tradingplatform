class OptionChain
{
  expiry;
  h_call_tbl;
  h_put_tbl;
  atm = 0;
  row_map = new Map();
  u_price = 0;
  OTMRange = { high: 7, low: 1 };

  constructor(expiry, v_oc_id)
  {
    this.expiry = expiry;
    this.#buildHTMLOC(v_oc_id);
    this.interval = STRIKE_SIZE[instrument.stockCode];

    optionChains.push(this);
    qBox.addEventListener('strikex', this);

    qBox.addEventListener('index', (event) => {
      this.setup(event.detail);
    }, { once: true });
  }

  #buildHTMLOC(v_oc_id)
  {    
    const h_oc_div = document.getElementById(v_oc_id);
    const tbls = Array.from(h_oc_div.querySelectorAll('table'));
    [this.h_call_tbl, this.h_put_tbl] = tbls;
  }

  setup(q)
  {
    this.u_price = q.ltp;
    this.atm = Math.round(q.ltp / this.interval) * this.interval;
  
    const range = this.OTMRange.high - this.OTMRange.low;  
    for (var i = 0; i <= range; i++) {
      
      let ce_strike = this.atm + (this.OTMRange.low + i) * this.interval;
      let pe_strike = this.atm - (this.OTMRange.high - i) * this.interval

      this.addRowCombo(ce_strike, pe_strike);
    }

    qBox.addEventListener('index', (event) => {
      this.handleUnderlying(event.detail);
    });
  }

  addRowCombo(ce_strike, pe_strike, direction = 1)
  {
    for(var i = 0; i < 2; i++) 
    {
      var key = i === 0 ? ce_strike + 'CE' : pe_strike + 'PE';
      if(this.row_map.get(key) === undefined)
      {
        const tr = tRow(t_option_chain_row);
        tr.classList.add(i ===  0 ? 'tr_straight' : 'tr_reverse');
        const tbl = i === 0 ? this.h_call_tbl : this.h_put_tbl;
        tr.cells[2].childNodes[3].textContent = i === 0 ? ce_strike : pe_strike;
        tr.title = instrument.stockCode + this.expiry + key;
      
        if(direction === 1)
          tbl.append(tr);
        else
          tbl.prepend(tr);

        if(this.row_map.get(key) === undefined)
          this.row_map.set(key, {row: tr});
      }
    }
  }

  handleEvent(event)
  {
    var q = event.detail;

    if(q?.expiry_date !== this.expiry)
      return;

    const r = this.row_map.get(q.strike_price + q.right);
    
    if(r === undefined)
      return;
   
    r.row.cells[1].textContent = q.ltp.toFixed(2);  
    q = addIVNDelta(q, this.u_price);
    r.row.cells[0].textContent = q.delta.toFixed(2);
  }

  handleUnderlying(q)
  {
    const ltp_move = q.ltp - this.atm;
    if (Math.abs(ltp_move) > this.interval )
    {
      const direction = Math.sign(ltp_move);
      this.atm = this.atm + this.interval * direction;
      
      const ce_offset = (direction === 1 ? this.OTMRange.high : this.OTMRange.low) * this.interval;
      const pe_offset = (direction === 1 ? this.OTMRange.low : this.OTMRange.high) * this.interval;
      
      this.addRowCombo(this.atm + (ce_offset * direction), this.atm + (pe_offset * direction), direction);
    }
  }

  markPosition(scrip, psize)
  {
    const key = (scrip.strike_price / this.interval - this.atm_index) + scrip.right;
    const r = this.row_map.get(key);
    
    if (r !== undefined) 
    {
      if (psize === '' || psize === 0) {
        r.row.cells[2].childNodes[1].textContent = '';
        r.row.classList.remove('buy', 'sell');
      }
      else
      {
        r.row.cells[2].childNodes[1].textContent = psize;
        r.row.cells[2].childNodes[1].classList.add(psize > 0 ? 'buy' : 'sell');
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

if (optionChains.findIndex((oc) => oc.expiry === instrument.oExpiries[0]) === -1)
  var c_option_chain = new OptionChain(instrument.oExpiries[0], 'c_oc_div');

if (optionChains.findIndex((oc) => oc.expiry === instrument.oExpiries[1]) === -1)
  var n_option_chain =  new OptionChain(instrument.oExpiries[1], 'n_oc_div');