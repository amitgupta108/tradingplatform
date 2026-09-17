class Order
{
  	stockCode = instrument.stockCode;
  	appid = instrument.appid;
  	pricetype = 'MARKET';
  	product = 'NRML';
  	price = 0;
  	orderid;
  	symbol;
  	action;
  	quantity;
	static ordermap = new Map();

	constructor(symbol, action, quantity, orderid)
	{
		this.symbol = symbol;
		this.action = action;
		this.quantity = (quantity !== undefined) ? quantity : 1;
		this.orderid = orderid;
		this.type = orderid === undefined ? 'create' : 'modify';

		Order.ordermap.set(symbol, this);
	}

	static getOrder(symbol){
		return Order.ordermap.get(symbol);
	}
}

function validate(clickedBtn)
{
  	var isError = false;
  	const rows = Array.from(order_rows_tbody.rows);

  	const neworders = rows.map((r) => {
		
		const symbol = qSel(r, 'owsymbol', 'id').textContent;
		const order = Order.getOrder(symbol);
		if(order === undefined)
		{		
			order.action = r.querySelector('#ow_action_btn').innerText;
			order.orderquantity = r.querySelector('select').value;
			order.pricetype = r.querySelector('#ordertype').innerText;

			if(pricetype === 'LIMIT')
			{
				const h_price = qSel(r, 'lmtprice', 'id');
				if(h_price.value === "") {
					h_price.style.border = '1px solid red';
					isError = true;
				}
				else
					order.price = Number(h_price.value);
			}
			return order;
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
			newtr.childNodes[3].textContent = o.action.slice(0, 1);
			newtr.childNodes[5].textContent = o.filled_q + ' / ' + o.quantity;
			newtr.childNodes[7].textContent = o.pricetype.slice(0, 1);
			newtr.childNodes[9].textContent = tqty;
			newtr.childNodes[11].textContent = (o.state === 'opened' ? o.price : o.state === 'cancelled' ? 0 : o.pricedAt);
			newtr.childNodes[13].textContent = o.state;
			newtr.childNodes[15].childNodes[1].innerText = (o.state === 'opened' ? 'X' : '');
			if(o.state === 'opened')
				newtr.childNodes[15].childNodes[1].classList.add('clickable');

			order_list_tbody.append(newtr);
		});
		orderlistDiv.style.display = 'flex';
	}
}