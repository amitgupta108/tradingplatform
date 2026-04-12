var socket;

if(instrument.mode !== 3) {
  socket = io(`https://localhost:${window.location.port}`, {
    auth: {
      token: instrument.uid,
      mode: instrument.mode,
      stockCode: instrument.stockCode
    },
    timeout: 60000,
    reconnectionDelay: 5000,
    reconnectionDelayMax: 5000,
  });
}

socket.io.on("reconnect", (attempt) => {
    logSocketEvent("Reconnected on attempt # " + attempt);
});

socket.io.on("reconnect_attempt", (attempt) => {
    logSocketEvent("Reconnection being tried attempt # " + attempt);
});

socket.io.on("reconnect_error", (error) => {
    logSocketEvent("Reconnection error " + error.message);
});

socket.io.on("reconnect_failed", () => {
    logSocketEvent("Reconnection not possible");
});

const socketEventLogging = false;
function logSocketEvent(message){
  if(socketEventLogging)
      console.log(message);
}
rh(socket);
/*--------------------------------------------------------------------------------------------------------------------------------*/
function rh(socket)
{  
  socket.on("connect", () => {
    console.log('socket connected for uid' + socket.id + '-' + instrument.uid);
    if(socket.recovered) {
      console.log('connection recovered ' + socket.id);
    }
    else {
      console.log('Freshly connected ' + socket.id);
    }
  });

  socket.on("connect_error", (error) => {
    console.log('connection error for uid' + socket.id + '-' + instrument.uid + '-' + error.message);
    if (socket.active) {
      console.log('connection error reconnection to be tried ' + socket.id);
    } else {
      // the connection was denied by the server
      // in that case, `socket.connect()` must be manually called in order to reconnect
      console.log('No reconnection ' + error.message);
    }
  });

  socket.on("disconnect", (reason, details) => {
    console.log('disconnected for uid' + socket.id + '-' + instrument.uid + '-' + reason + '-' + JSON.stringify(details));
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