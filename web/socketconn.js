rh(socket);

function rh(socket)
{
  socket.on('restored', (response) => {     
    console.log(response + " continue?");
  });

  socket.on('recovered', (response) => {     
    console.log(response + " continue?");
  });
  
  socket.on('prevsession', (response) => {     
    console.log('prevsession exists: ' + JSON.stringify(response));
    if(response.uid === instrument.uid)
      if (OptionChain.get(instrument.oExpiry) === undefined)
        new OptionChain(instrument.oExpiry, 'ocBody');
  });

  socket.on('futuresPreData', (fQuotes) => {
    setFuturesChart(fQuotes);
  });

  socket.on('qdeltastrikes', (uQuotes, peQuotes, ceQuotes) => {
    setUpInitialNiftyChart(uQuotes);
    setUpInitialOptionsChart(peQuotes, ceQuotes, instrument.oExpiry); 
    document.getElementById("btnStartSim").disabled = false;
  });

  socket.on('index', (q) => 
  {
    qBox.dispatchEvent(generateEvent('index', q));
  
    if(q.exchange === 'MCX')
      futuresChart(q);
    
    uQuoteGl = q;  

    var lt = new Date(q.ltt);
    timerText.innerText = lt.toDateString() + ", " + lt.toLocaleTimeString() + " |   Spot: " + q.close.toFixed(2);
  });
  
  socket.on('vix', (q) => {
    if(q !== undefined)
      qBox.dispatchEvent(generateEvent('vix', q));
  });

  socket.on('futures', (q) => {    
      qBox.dispatchEvent(generateEvent('futures', q));
      document.title = "Futures " + q.close.toFixed(2);
  });

  socket.on('strikex', (q) => {
      qBox.dispatchEvent(generateEvent('strikex', q));
  });
  
  socket.on('positionbook', (response) => {
    loadOrders(response.data);
  });

  socket.on('orderbook', (response) => {
    loadOrders(response);
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