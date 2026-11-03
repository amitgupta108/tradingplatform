class OptionChain {
	expiry;
	h_call_tbl;
	h_put_tbl;
	atm = 0;
	row_map = new Map();
	decorations = new Map();
	OTMRange = { high: 9, low: 2 };

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
				this.applyDecorations(symbol, call_rows[i]);

				symbol = instrument.stockCode + this.expiry + pe_strike + 'PE';
				put_rows[i].cells[2].childNodes[3].textContent = pe_strike;
				put_rows[i].title = symbol
				this.row_map.set(symbol, { row: put_rows[i] });
				this.applyDecorations(symbol, put_rows[i]);
			}
		}
	}

	applyDecorations(symbol, row){
		const action = this.decorations.get(`${symbol}_highlight`);
		this.highlightRow(symbol, row, action);

		const psize = this.decorations.get(`${symbol}_positionsize`);
		this.showOpenPosition(symbol, row, psize);
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

	decorate(symbol, decoration){
		const r = this.row_map.get(symbol);
		if(r !== undefined) {
			if(decoration.key === 'highlight')
				this.highlightRow(symbol, r.row, decoration.value)
			else if (decoration.key === 'positionsize')
				this.showOpenPosition(symbol, r.row, decoration.value);
		}
	}

	highlightRow(symbol, row, action) {
		if(action === 'toggle')
				action = (!this.decorations.get(`${symbol}_highlight`)) ? 'add': 'remove';

		if(action === undefined || action === 'remove'){
			row.classList.remove('row-highlight');
			this.decorations.delete(`${symbol}_highlight`);
		}
		else if(action === 'add') {
			row.classList.add('row-highlight');
			this.decorations.set(`${symbol}_highlight`, action);
		}
	}

	showOpenPosition(symbol, row, psize) {
		if (psize === undefined || psize === 0) {
			row.cells[2].childNodes[1].textContent = '';
			row.classList.remove('buy', 'sell');
			this.decorations.delete(`${symbol}_positionsize`);
		}
		else {
			row.cells[2].childNodes[1].textContent = psize;
			row.cells[2].childNodes[1].classList.add(psize > 0 ? 'buy' : 'sell');
			this.decorations.set(`${symbol}_positionsize`, psize);
		}
	}

	static get(expiry) {
		return optionChains.find((o) => {
			return o.expiry === expiry;
		});
	}
}