class Order {
	static ordermap = new Map();

	constructor(symbol, action, quantity, orderid) {
		this.stockCode = profile.stockCode;
		this.appid = profile.appid;
		this.ordertype = 'MKT';
		this.product = 'NRML';
		this.lmt_price = 0;
		this.trg_price = 0;
		this.symbol = symbol;
		this.action = action;
		this.quantity = (quantity !== undefined) ? quantity : LOT_SIZE[profile.stockCode];
		this.orderid = orderid;
		this.isModify = orderid !== undefined;
		this.strategy = 'default';

		Order.ordermap.set(symbol, this);
	}

	static getUIOrder(symbol) {
		return Order.ordermap.get(symbol);
	}

	static removeUIOrder(symbol) {
		Order.ordermap.delete(symbol);
	}

	static clearUIOrders() {
		Order.ordermap.clear();
	}

	static findOpenOrder(symbol, orderid) {
		const p = Position.findPosition(symbol);
		const order = p?.orders.get(orderid);
		if (order !== undefined && order.state === 'opened')
			return order;
	}
}

function validate(clickedBtn) {
	const rows = Array.from(order_rows_tbody.rows);
	in_prep_orders.isError = false;

	const neworders = rows.map((r) => {
		const symbol = r.querySelector('#owsymbol').innerText;
		const order = Order.findOpenOrder(symbol, r.title) ?? Order.getUIOrder(symbol);

		const neworder = structuredClone(order);
		if (order !== undefined) {
			neworder.action = r.querySelector('#ow_action_btn').innerText;
			neworder.quantity = r.querySelector('select').value * LOT_SIZE[profile.stockCode];
			neworder.ordertype = r.querySelector('#ordertype').textContent;

			const lmt_price_tb = r.querySelector('#lmt_price_tb');
			const trg_price_tb = r.querySelector('#trg_price_tb');
			const cur_price = Number(r.querySelector('#owprice').textContent);

			if (lmt_price_tb.disabled === false && Number(lmt_price_tb.value) === 0) {
				lmt_price_tb.style.border = '1px solid red';
				in_prep_orders.isError = true;
			}
			else {
				neworder.lmt_price = Number(lmt_price_tb.value);
				lmt_price_tb.style.border = 'none';
			}

			if (trg_price_tb.disabled === false && Number(trg_price_tb.value) === 0) {
				trg_price_tb.style.border = '1px solid red';
				in_prep_orders.isError = true;
			}
			else {
				neworder.trg_price = Number(trg_price_tb.value);
				trg_price_tb.style.border = 'none';
			}
			if (neworder.isModify && !order.orderid) {
				r.style.border = '1px solid red';
				in_prep_orders.isError = true;
			}

			if (in_prep_orders.isError === false) {
				if (neworder.ordertype.includes('LMT')) {
					if (neworder.action === 'BUY' && Number(neworder.lmt_price) > cur_price)
						in_prep_orders.isError = true;
					else if (neworder.action === 'SELL' && Number(neworder.lmt_price) < cur_price)
						in_prep_orders.isError = true;
				}

				if (neworder.ordertype.includes('SL')) {
					if (neworder.action === 'BUY' && Number(neworder.trg_price) < cur_price)
						in_prep_orders.isError = true;
					else if (neworder.action === 'SELL' && Number(neworder.trg_price) > cur_price)
						in_prep_orders.isError = true;
				}
				if (in_prep_orders.isError === true)
					clickedBtn.style.border = '1px solid red';
			}
		}
		return neworder;
	});
	in_prep_orders.orders = neworders;
	submitOWinBtn.disabled = in_prep_orders.isError;
}

function submitOrder(clickedBtn) {
	if (!in_prep_orders.isError) {
		emit('order', in_prep_orders.orders);

		sOrderSubmit.play();
		hideOWin();
	}
}

function displayOrderList(btn, parent) {
	const symbol = parent.title;
	const list_head = order_list_thead.querySelector('td');

	if (orderlistDiv.style.display !== 'none' && symbol === list_head.title)
		orderlistDiv.style.display = 'none';
	else {
		const p = Position.findPosition(symbol, false);
		list_head.textContent = getScrip(symbol).name;
		list_head.title = symbol;
		order_list_tbody.innerHTML = "";

		var tqty = 0;
		p.orders.forEach((o, idx) => {
			var newtr = tRow(t_order_list_row);

			newtr.title = o.orderid;
			var qty = o.state.startsWith('complete') ? o.filled_q : 0;
			tqty = tqty + Number(qty * (o.action === 'B' ? 1 : -1));

			newtr.childNodes[1].textContent = o.orderid;
			newtr.childNodes[3].textContent = o.action;
			newtr.childNodes[5].textContent = o.filled_q + ' / ' + o.quantity;
			newtr.childNodes[7].textContent = o.ordertype.slice(0, 1);
			newtr.childNodes[9].textContent = tqty;
			newtr.childNodes[11].textContent = (o.state === 'opened' ? o.lmt_price : o.state === 'cancelled' ? 0 : o.pricedAt);
			newtr.childNodes[13].textContent = o.state;
			newtr.childNodes[15].childNodes[1].innerText = (o.state === 'opened' ? 'X' : '');
			newtr.childNodes[15].childNodes[1].disabled = (o.state === 'opened' ? false : true);
			if (o.state === 'opened')
				newtr.childNodes[15].childNodes[1].classList.add('clickable');
			else
				newtr.childNodes[15].childNodes[1].classList.remove('clickable');

			order_list_tbody.append(newtr);
		});
		orderlistDiv.style.display = 'flex';
	}
}