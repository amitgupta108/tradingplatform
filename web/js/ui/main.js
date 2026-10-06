function emit(event, arg1, arg2) {
	socket.emit(event, arg1, arg2);
}

function historyParams()
{
	const endTime = instrument.simStartTime ?? Date.now();
	const startTime = endTime - 4 * 24 * 60 * 60 * 1000; // 4 days back

	const p = {
		stockCode: instrument.stockCode,
		fExpiry: instrument.fExpiry,
		startTime: startTime,
		endTime: endTime - 1000,
		interval: '5minute'
	}
	return p;
}

function getHistory(symbols)
{
	const requests = new Array();
	symbols.forEach((s) => {
		const p = historyParams();
		p.symbol = s;
		requests.push(p);
	});
	emit('history', requests);
}

function changeSpeed()
{
	var selectBoxValue = document.getElementById("optionSpeed").value;
	emit('speed', selectBoxValue);
}

function start()
{
	const futures = instrument.stockCode + instrument.fExpiry + 'FUT';
	getHistory([futures, instrument.stockCode, 'INDVIX']);
	emit('startv2', instrument); 
}

function stop() 
{
	if(document.getElementById('btnStopSim').innerText === 'Stop')
		emit('stream', 'pause');
	else if (document.getElementById('btnStopSim').innerText === 'Resume')
		emit('stream', 'resume');
}

function exit() 
{
	//socket.disconnect();
	//bottom_btns.forEach((btn) => btn.disabled = true);
	emit('exit', 'pause');
}

function listOrders()
{
	emit('orderbook', instrument.stockCode);
}
	
function streamOptionChain(event)
{  
	event.stopPropagation();
	const idx = document.getElementById('expiry_btn_1').disabled ? 0 : 1;
	emit('option_chain', {expiry: instrument.oExpiries[idx], action:'toggle'});
}

function wsOps(action)
{
	emit('wsOps', action, tpt);
}

function subs_vix()
{
	qBox.reset();
}

function reload()
{
	emit('reload', '');
}

function auth(action)
{
	const provider = document.getElementById("tpt").value;
	emit('authenticate', provider);
	document.getElementById("tpt").value = "";
}

function showChart() {
	switchCharts(1);
	let container;
	if(c_oc_container.classList.contains('active'))
		container = c_oc_container;
	else
		container = n_oc_container;

	const rows = container.querySelectorAll('tr.row_background');
	if (rows.length !== 0)
	{
		const symbols = Array.from(rows).map((r) => r.title);
		options_chart.show(symbols, true);
	}
}