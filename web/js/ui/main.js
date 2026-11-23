function emit(event, arg1, arg2) {
	socket.emit(event, arg1, arg2);
}

function getHistory(symbols) {
	const endTime = instrument.simStartTime ?? Date.now();

	emit('history', {
		symbols: symbols,
		startTime: endTime - 3 * 24 * 60 * 60 * 1000,
		endTime: endTime - 1000,
		interval: '5minute',
	});
}

function changeSpeed() {
	var selectBoxValue = document.getElementById("optionSpeed").value;
	emit('speed', selectBoxValue);
}

function start() {
	const futures = instrument.stockCode + instrument.fExpiry + 'FUT';
	getHistory([futures, instrument.stockCode, 'INDVIX']);
	emit('startv2', instrument);
}

function pauseResume() {
	const action = document.getElementById('btnStopSim').innerText;
	emit('stream', action.toLowerCase());

	document.getElementById('btnStopSim').innerText = action.toLowerCase() === 'pause' ? 'Resume' : 'Pause';
}

function exit() {
	emit('exit', 'exit');
}

function listOrders() {
	emit('orderbook', instrument.stockCode);
}

function streamOptionChain(event) {
	event.stopPropagation();
	const idx = document.getElementById('expiry_btn_1').disabled ? 0 : 1;
	emit('option_chain', { expiry: instrument.oExpiries[idx], action: { key: 'stream', value: 'toggle' } });
}

function auth(action) {
	const provider = document.getElementById("tpt").value;
	emit('authenticate', provider);
	document.getElementById("tpt").value = "";
}

function algo(action) {
	emit('algo', 'toggle');
}

function showChart() {
	switchCharts(1);
	let container;
	if (c_oc_container.classList.contains('active'))
		container = c_oc_container;
	else
		container = n_oc_container;

	const rows = container.querySelectorAll('tr.row-highlight');
	if (rows.length !== 0) {
		const symbols = Array.from(rows).map((r) => r.title);
		options_chart.show(symbols, true);
	}
}