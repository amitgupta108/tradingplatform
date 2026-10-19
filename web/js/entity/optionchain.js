class OptionChain {
	expiry;
	h_call_tbl;
	h_put_tbl;
	atm = 0;
	row_map = new Map();
	OTMRange = { high: 6, low: 0 };

	constructor(expiry, v_oc_id) {
		this.expiry = expiry;
		this.interval = STRIKE_SIZE[instrument.stockCode];

		const h_oc_div = document.getElementById(v_oc_id);
		const tbls = Array.from(h_oc_div.querySelectorAll('table'));
		[this.h_call_tbl, this.h_put_tbl] = tbls;

		const range = this.OTMRange.high - this.OTMRange.low;
		for (var i = 0; i <= range; i++) {
			const call_tr = tRow(t_option_chain_row);
			call_tr.classList.add('tr_straight');
			this.h_call_tbl.append(call_tr);

			const put_tr = tRow(t_option_chain_row);
			put_tr.classList.add('tr_reverse');
			this.h_put_tbl.append(put_tr);
		}

		optionChains.push(this);
		qBox.addEventListener('strikex', this);

		qBox.addEventListener('futures', (event) => {
			this.handleUnderlying(event.detail);
		});
	}

	handleUnderlying(q) {

		const ltp_move = q.ltp - this.atm;
		if (Math.abs(ltp_move) > this.interval) {

			this.atm = Math.round(q.ltp / this.interval) * this.interval;
			const range = this.OTMRange.high - this.OTMRange.low;

			const call_rows = Array.from(this.h_call_tbl.rows);
			const put_rows = Array.from(this.h_put_tbl.rows);
			this.row_map.clear();
			for (var i = 0; i <= range; i++) {
				let ce_strike = this.atm + (this.OTMRange.low + i) * this.interval;
				let pe_strike = this.atm - (this.OTMRange.high - i) * this.interval

				let symbol = instrument.stockCode + this.expiry + ce_strike + 'CE';
				call_rows[i].cells[2].childNodes[3].textContent = ce_strike;
				call_rows[i].title = symbol
				this.row_map.set(symbol, { row: call_rows[i] });

				symbol = instrument.stockCode + this.expiry + pe_strike + 'PE';
				put_rows[i].cells[2].childNodes[3].textContent = pe_strike;
				put_rows[i].title = symbol
				this.row_map.set(symbol, { row: put_rows[i] });
			}
		}
	}

	handleEvent(event) {
		var q = event.detail;

		if (q?.expiry_date !== this.expiry)
			return;

		const r = this.row_map.get(q.symbol);

		if (r === undefined)
			return;

		r.row.cells[1].textContent = q.ltp.toFixed(2);
		q = addIVNDelta(q, futures_ltp);
		if (q.delta !== undefined)
			r.row.cells[0].textContent = q.delta.toFixed(2);
	}

	markPosition(symbol, psize) {
		const r = this.row_map.get(symbol);

		if (r !== undefined) {
			if (psize === 0) {
				r.row.cells[2].childNodes[1].textContent = '';
				r.row.classList.remove('buy', 'sell');
			}
			else {
				r.row.cells[2].childNodes[1].textContent = psize;
				r.row.cells[2].childNodes[1].classList.add(psize > 0 ? 'buy' : 'sell');
			}
		}
	}

	static get(expiry) {
		return optionChains.find((o) => {
			return o.expiry === expiry;
		});
	}
}