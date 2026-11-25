let socket;

function connect() {
	socket = io(`${window.location.origin}`, {
		auth: {
			appid: profile.appid,
			mode: profile.mode
		},
		reconnection: false,
		timeout: 10000
	});
	rh(socket);
}

function rh(socket) {
	socket.on("connect", () => {
		console.log('socket connected for appid' + socket.id + '-' + profile.appid + '-' + socket.recovered);
		bottom_btns[0].disabled = true;
		bottom_btns[1].disabled = false;
		bottom_btns[2].disabled = false;
		bottom_btns[3].disabled = false;
		bottom_btns[4].disabled = false;

		if (profile.mode === 'HISTORY')
			document.getElementById('optionSpeed').disabled = false;
	});

	socket.on("connect_error", (error) => {
		console.log('connection error for appid' + socket.id + '-' + profile.appid + '-' + error.message);
		if (socket.active) {
			console.log('connection error reconnection to be tried ' + socket.id);
		} else {
			// the connection was denied by the server
			// in that case, `socket.connect()` must be manually called in order to reconnect
			console.log('No reconnection ' + error.message);
		}
	});

	socket.on("disconnect", (reason) => {
		bottom_btns[0].disabled = false;
		console.log('disconnected for socketid-appid ' + socket.id + '-' + profile.appid + '-' + reason);
	});

	socket.on('history', (data) => {
		if (data.symbol.endsWith('PE') || data.symbol.endsWith('CE'))
			options_chart.renderHistory(data.symbol, data.qA);
		else
			setInitialChart(data.symbol, data.qA);
	});

	socket.on('quote', (q) => {
		qBox.dispatchEvent('quote', q);
	});

	socket.on('stream', (response) => {
		if (response === 'paused')
			document.getElementById('btnStopSim').innerText = 'Resume';
		else if (response === 'resumed')
			document.getElementById('btnStopSim').innerText = 'Stop';
		else if (response === 'started') {
			bottom_btns[2].disabled = false;
			bottom_btns[5].disabled = false;
		}
	});

	socket.on('exit', (response) => {
		bottom_btns.forEach((btn, i) => {
			btn.disabled = i === 0 ? false : true;
		});
		window.location.reload();
	});

	socket.on('order', (exorder) => {
		if (exorder.appid !== profile.appid)
			return;

		var p = Position.findPosition(exorder.symbol, true);
		p.orderupdate(exorder);
	});

	socket.on('orderbook', (orders) => {
		orders.forEach((order) => {
			if (getScrip(order.symbol).stockCode === profile.stockCode) {
				const p = Position.findPosition(order.symbol, true);
				p.orders.set(order.orderid, order);
			}
		});

		positions.values().forEach((p) => {
			p.positionUpdate();
		});
	});

	socket.on('hb', (resp) => {
		console.log('hb', resp?.order_socket);
		if (resp?.order_socket === 1)
			socn.style.backgroundColor = '#4CAF50';
		else
			socn.style.backgroundColor = '#f44336';
	});
}