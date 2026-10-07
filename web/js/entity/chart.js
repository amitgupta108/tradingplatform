const nTVtime = unixtime => Math.round(unixtime/1000) + 330 * 60;
const sTVtime = datetime => Math.round(Date.parse(datetime)/1000) + 330 * 60;
const ema_alpha = 2/21;
const ema_beta = 1 - ema_alpha;
const ema = (previous, current) => {
	return ema_alpha * current + ema_beta * previous;
};

class ChartEventEmitter extends EventTarget 
{
	constructor()
	{
		super();
		qBox.addEventListener('index', this);
		qBox.addEventListener('futures', this);
		qBox.addEventListener('vix', this);
	}

	handleEvent(event)
	{
		const q = event.detail;
		renderChart(series[event.type].ref, series[`ema_${event.type}`], q);
	}
}

const ChartEventer = new ChartEventEmitter();

function setInitialChart(symbol, qA)
{
	const key = symbol.endsWith('FUT') ? 'futures' : symbol.toLowerCase().includes('vix') ? 'vix' : 'index';
	const withEma = ['futures', 'index'].includes(key) ? true : false;
	var qs = initialSeriesData(qA, withEma);
	series[key].ref.setData(qs);

	if (withEma) 
		series[`ema_${key}`].ref.setData(qs);
}

function initialSeriesData(qA, withEma = false)
{
	if (qA === undefined || qA === null || qA.length === 0)
		return;

	var qs = qA.filter((e) => !(e.datetime.includes('9:00') ||e.datetime.includes('9:05') || e.datetime.includes('9:10')));
	for(var i = 0; i < qs.length; i++)
	{
		qs[i].time = i === 0 || qs[i].datetime.includes('9:15') ? sTVtime(qs[i].datetime) : qs[i-1].time + 5 * 60;
		if(withEma)
			qs[i].value = i === 0 ? qs[i].close : ema(qs[i-1].value, qs[i].close);
	}
	return qs;
}

function renderChart(series_main, series_ema, q)
{
	var curCandle = series_main.data().at(-1);
	let c;
	const newCan = curCandle === undefined || nTVtime(q.ltt) - curCandle.time > 299;
	if (newCan)
		c = newCandle(q, curCandle);
	else
		c = updateCandle(q, curCandle);

	series_main.update(c);

	if (series_ema !== undefined) {
		if(newCan)
			series_ema.val = series_ema.ref.data().at(-1) === undefined ? q.ltp : series_ema.ref.data().at(-1).value;
		series_ema.ref.update({ time: c.time, value: ema(series_ema.val, q.ltp)});
	}
}

function newCandle(q, curCandle){
	return {
		time: nTVtime(q.ltt) - (nTVtime(q.ltt) % 300),
		open: (curCandle) ? curCandle.close : q.open ?? q.ltp,
		high: q.ltp,
		low: q.ltp,
		close: q.ltp
	};
}

function updateCandle(q, curCandle){
	curCandle.high = Math.max(q.ltp, curCandle.high);
	curCandle.low = Math.min(q.ltp, curCandle.low);
	curCandle.close = q.ltp;

	return curCandle;
}

function lookbackPeriod()
{
	const endTime = instrument.simStartTime ?? Date.now();
	const startTime = endTime - 4 * 24 * 60 * 60 * 1000; // 4 days back

	return {startTime: startTime, endTime: endTime, interval: '5minute'};
}

class Chart
{
	constructor(container, options)
	{
		this.currentcount = 0;
		this.symbols = [];
		this.series = []; //symbol: undefined, lastq: undefined, ref: undefined, hist: []

		this.strat_series;
		this.withStrategy = true;

		this.setupChart(container, options);
		qBox.addEventListener('strikex', this);
	}

	setupChart(container, options)
	{
		this.chart = LightweightCharts.createChart(container, options);
		this.chart.priceScale('right').applyOptions({
			visible: true,
			mode: 0,
		});

		this.strat_series = this.chart.addSeries(LightweightCharts.CandlestickSeries,
			{ priceScaleId: 'right', title: 'ST' });
	}

	show(symbols, withStrategy = true)
	{
		this.symbols = symbols;
		this.withStrategy = withStrategy;
		this.currentcount = 0;
		this.requestHistory(this.symbols);

		for (var i = 0; i < this.symbols.length; i++)
		{
			if(this.series[i] === undefined)
				this.series[i] = {
					symbol: this.symbols[i], ref: this.chart.addSeries(LightweightCharts.CandlestickSeries,
					{ priceScaleId: 'right', title: this.symbols[i].slice(-7) })
				};
			else
				this.series[i].symbol = this.symbols[i];
		}

		this.chart.timeScale().fitContent();
		this.chart.timeScale().scrollToPosition(15);
	}

	handleEvent(event)
	{
		const q = event.detail;
		const idx = this.symbols.findIndex((s) => q.symbol === s);
		if(idx !== -1)
		{
			this.series[idx].lastq = q;
			renderChart(this.series[idx].ref, undefined, q);
		
			if(this.withStrategy)
				renderChart(this.strat_series, undefined, {ltp: this.strategyImpl(), ltt: q.ltt});
		}
	}

	strategyImpl() 
	{
		let strategy_price = 0;
		for (var i = 0; i < this.symbols.length; i++) {
			strategy_price += this.series[i].lastq !== undefined ? this.series[i].lastq.ltp : 0;
		}
		return strategy_price;
	}

	renderHistory(symbol, qA)
	{
		const qs = initialSeriesData(qA);
		if (qs && qs.length > 0) 
		{
			const idx = this.symbols.findIndex((s) => s === symbol);
			this.series[idx].ref.setData(qs);
			this.series[idx].hist = qs;
			++this.currentcount;
		}

		if (this.withStrategy && this.currentcount === this.symbols.length)
		{
			const hist_length = this.series[0].hist.length;
			let aggregate_hist = [hist_length];
			for (var i = 0; i < hist_length; i++) 
			{
				aggregate_hist[i] = {
					time: sTVtime(this.series[0].hist[i].datetime),
					close: 0, high: 0, open: 0, low: 0,
				};
				for (var j = 0; j < this.symbols.length; j++) {
					aggregate_hist[i]['close'] += this.series[j].hist[i]['close'];
					aggregate_hist[i]['high'] += this.series[j].hist[i]['high'];
					aggregate_hist[i]['open'] += this.series[j].hist[i]['open'];
					aggregate_hist[i]['low'] += this.series[j].hist[i]['low'];
				}
			}
			this.strat_series.setData(aggregate_hist);
			aggregate_hist = [];
		}
	}

	requestHistory(symbols)
	{
		const requests = [];
		const p = lookbackPeriod();
		for (const s of symbols){
			const r = structuredClone(p);
			r.symbol = s;
			requests.push(r);
		}
		socket.emit('history', requests);
	}
}

const charts = {
	futures: { container: 'futures_chart' },
	index: { container: 'index_chart' },
	strikes: { container: 'strikes_chart' }
};

const gridLineOptions = {
	color: '#f4f4f43f',
	style: 2,
	visible: true
};

const chartOptions = {
	autoSize: true,
	layout: {
		textColor: '#f4f4f48b',
		background: { color: '#1d1616c8' },
		attributionLogo: false,
	},
	grid: {
		vertLines: gridLineOptions,
		horzLines: gridLineOptions,
	},
	crosshair: {
		mode: 0, // CrosshairMode.Normal
	},
	timeScale: {
		minBarSpacing: 2,
		visible: true,
		timeVisible: true,
		secondsVisible: false,
		tickMarkMaxCharacterLength: 5,
	},
	defaultVisiblePriceScaleId: 'right',
	handleScale: {
		axisPressedMouseMove: {
			timeScale: true,
			priceScale: true,
		},
	},
};

const chart1 = LightweightCharts.createChart(charts['futures'].container, chartOptions);
const chart2 = LightweightCharts.createChart(charts['index'].container, chartOptions);
const options_chart = new Chart(charts['strikes'].container, chartOptions);

const priceScaleOptions = {
	visible: true,
	autoScale: true,
	mode: 0,
};
chart1.priceScale('left').applyOptions(priceScaleOptions);

const series = {
	vix: {ref: chart1.addSeries(LightweightCharts.CandlestickSeries, {priceScaleId: 'left'}), val: 0},
	futures: {ref: chart1.addSeries(LightweightCharts.CandlestickSeries, { priceScaleId: 'right' }), val: 0},
	ema_futures: {ref: chart1.addSeries(LightweightCharts.LineSeries, { priceScaleId: 'right', color: '#2962FF', lineWidth: 2 }), val: 0},
	index: {ref: chart2.addSeries(LightweightCharts.CandlestickSeries, { priceScaleId: 'right' }), val: 0},
	ema_index: {ref: chart2.addSeries(LightweightCharts.LineSeries, { color: '#2962FF', lineWidth: 2 }), val: 0},
};

chart1.timeScale().fitContent();
chart1.timeScale().scrollToPosition(15);
chart2.timeScale().fitContent();
chart2.timeScale().scrollToPosition(15);