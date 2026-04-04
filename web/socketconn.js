var uQuoteGl;

socket = io(`https://localhost:${window.location.port}`, {
  auth: {
    token: uuid,
    mode: instrument.mode,
    stock: instrument.stockCode
  },
  timeout: 60000,
  reconnectionDelay: 5000,
  reconnectionDelayMax: 5000,
});
rh(socket);

function rh(socket)
{
  socket.on('restored', (response) => {     
    console.log(response + " continue?");
  });

  socket.on('recovered', (response) => {     
    console.log(response + " continue?");
  });

  socket.on('futuresPreData', (fQuotes) => {
    setFuturesChart(fQuotes.quotes);
  });

  socket.on('qdeltastrikes', (uQuotes, peQuotes, ceQuotes) => {
    setUpInitialNiftyChart(uQuotes);
    setUpInitialOptionsChart(peQuotes, ceQuotes, instrument.oExpiry); 
    document.getElementById("btnStartSim").disabled = false;
  });

  socket.on('index', (q) => {
  
    if(q.exchange === 'MCX')
      futuresChart(q);
    
    uQuoteGl = q;  

    optionChains.forEach((e) => {
      if(e.atm === undefined)
        e.atm = Math.round(q.close / 50) * 50;
    });

    var lt = new Date(q.ltt);
    timerText.innerHTML = lt.toDateString() + ", " + lt.toLocaleTimeString() + " |   Spot: " + q.close.toFixed(2);
  });

  socket.on('vix', (q) => {
    if(q !== undefined)
      qBox.dispatchEvent(generateEvent('vix', q));
  });

  socket.on('futures', (fQuote) => {    
    if(fQuote != undefined)
    {
      futuresChart(fQuote);
      document.title = fQuote.symbol + " " + fQuote.close.toFixed(2);
    }
  });

  socket.on('strikex', (q) => {
    try {
      
      var p = Position.findPositionRow(q.symbol);
      if(p != undefined) 
        refreshPositionPL(p, q.close) 
      
      OptionChain.update(q);

      orderquote(q);
    } catch(error) {
      console.log(error);
    }
  });
  
  socket.on('positionbook', (response) => {
    refreshPositions(response.data);
  });

  socket.on('orderconf', (response) => {
    console.log("immediate order conf:  " + JSON.stringify(response));
    
    var p = positions.find((e) => e.symbol === response.symbol);
    
    response.state = response.status === 'success' ? 'submitted' : 'rejected';
    p.orders[response.orderN - 1] = response;
  });

  socket.on('simorder', (exorder) => {
    console.log("sim order update " + JSON.stringify(exorder));

    var p = positions.find((e) => e.symbol === exorder.symbol);
    p.orderupdate(exorder);
  });

  socket.on('liveorder', (exorder) => {
    console.log("live order update " + JSON.stringify(exorder));
    
    //var p = positions.find((e) => e.symbol === exorder.symbol);
    //p.orderupdate(exorder);
  });

  socket.on('ws-order', (exorder) => {
    console.log("ws order message " + JSON.stringify(exorder));

    var p = positions.find((e) => e.symbol === exorder.trdSym);
    p.wsorderupdate(exorder);
  });

  socket.on('ws-position', (pmsg) => {
    console.log("position message " + pmsg)
    var sp = pmsg.data;
    positions.map((p) => {
      if(p.symbol === sp.symbol){
        p.value(p.psize === (sp.flBuyQty - sp.ftSellQty) ? 1 : 0);
      }
    });
  });

  socket.on('ws-hb', (state) => {
    if(state === 'connected' || Number(state) === 1)
      document.getElementById('socn').style.backgroundColor = '#4CAF50';
    else
      document.getElementById('socn').style.backgroundColor = '#f44336';
  });

  socket.on('ws-cn', (msg) => {
    console.log("connection message " + msg)  
    document.getElementById('socn').style.backgroundColor = '#4CAF50';
  });
}
