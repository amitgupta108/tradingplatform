class Order
{
	static ordermap = new Map();

	constructor(symbol, action, quantity, orderid)
	{
		this.stockCode = instrument.stockCode;
		this.appid = instrument.appid;
		this.pricetype = 'MARKET';
		this.product = 'NRML';
		this.price = 0;
		this.symbol = symbol;
		this.action = action;
		this.quantity = (quantity !== undefined) ? quantity : 1;
		this.orderid = orderid;
		this.type = orderid === undefined ? 'create' : 'modify';

		Order.ordermap.set(symbol, this);
	}

	static getUIOrder(symbol){
		return Order.ordermap.get(symbol);
	}

	static findOpenOrder(symbol, orderid){
		const p = Position.findPosition(symbol);
		const order = p?.orders.get(orderid);
		if(order !== undefined && order.state === 'opened')
			return order;
	}
}

function validate(clickedBtn)
{
  	var isError = false;
  	const rows = Array.from(order_rows_tbody.rows);

  	const neworders = rows.map((r) => {
		
		const symbol = qSel(r, 'owsymbol', 'id').textContent;
		const order = Order.findOpenOrder(symbol, r.title) ?? Order.getUIOrder(symbol);
		if(order !== undefined)
		{		
			const neworder = structuredClone(order);
			neworder.action = r.querySelector('#ow_action_btn').innerText;
			neworder.quantity = r.querySelector('select').value;
			neworder.pricetype = r.querySelector('#ordertype').textContent;

			if (neworder.pricetype === 'LIMIT')
			{
				const h_price = qSel(r, 'lmtprice', 'id');
				if(h_price.value === "") {
					h_price.style.border = '1px solid red';
					isError = true;
				}
				else
					neworder.price = Number(h_price.value);
			}
			return neworder;
		}
	});

	in_prep_orders.isError = isError;
	in_prep_orders.orders = neworders;
	submitOWinBtn.disabled = isError;
}

function submitOrder(clickedBtn)
{
  	if(!in_prep_orders.isError) {
		emit('order', in_prep_orders.orders);

  		sOrderSubmit.play();
  		hideOWin();
	}
}

function displayOrderList(btn, parent)
{
	const symbol = parent.title;
	const list_head = order_list_thead.querySelector('td');

	if(orderlistDiv.style.display !== 'none' && symbol === list_head.title)
		orderlistDiv.style.display = 'none';
	else
	{
		const p = Position.findPosition(symbol, false);
		list_head.textContent = expandSymbol(symbol).name;
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
			newtr.childNodes[5].textContent = o.filled_q + ' / ' + (o.quantity * LOT_SIZE[instrument.stockCode]);
			newtr.childNodes[7].textContent = o.pricetype.slice(0, 1);
			newtr.childNodes[9].textContent = tqty;
			newtr.childNodes[11].textContent = (o.state === 'opened' ? o.price : o.state === 'cancelled' ? 0 : o.pricedAt);
			newtr.childNodes[13].textContent = o.state;
			newtr.childNodes[15].childNodes[1].innerText = (o.state === 'opened' ? 'X' : '');
			newtr.childNodes[15].childNodes[1].disabled = (o.state === 'opened' ? false : true);
			if(o.state === 'opened')
				newtr.childNodes[15].childNodes[1].classList.add('clickable');
			else
				newtr.childNodes[15].childNodes[1].classList.remove('clickable');

			order_list_tbody.append(newtr);
		});
		orderlistDiv.style.display = 'flex';
	}
}