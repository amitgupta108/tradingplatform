var socket;

if(instrument.mode !== 3) {
  socket = io(`https://localhost:${window.location.port}`, {
    auth: {
      token: instrument.appid,
      mode: instrument.mode,
      stockCode: instrument.stockCode
    },
    timeout: 20000,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
}

socket.io.on("reconnect", (attempt) => {
    console.log("Reconnected on attempt # " + attempt);
});

socket.io.on("reconnect_attempt", (attempt) => {
    console.log("Reconnection being tried attempt # " + attempt);
});

socket.io.on("reconnect_error", (error) => {
    console.log("Reconnection error " + error.message);
});

socket.io.on("reconnect_failed", () => {
    console.log("Reconnection not possible");
});

rh(socket);
/*--------------------------------------------------------------------------------------------------------------------------------*/
function rh(socket)
{  
  try{
    socket.on("connect", () => {
      console.log('socket connected for appid' + socket.id + '-' + instrument.appid + '-' + socket.recovered); 
    });

    socket.on('prevsession', (streamingstatus) => {
      
      if(mainSeries.data().length === 0)
        loadPreData();
    });

    socket.on("connect_error", (error) => {
      console.log('connection error for appid' + socket.id + '-' + instrument.appid + '-' + error.message);
      if (socket.active) {
        console.log('connection error reconnection to be tried ' + socket.id);
      } else {
        // the connection was denied by the server
        // in that case, `socket.connect()` must be manually called in order to reconnect
        console.log('No reconnection ' + error.message);
      }
    });

    socket.on("disconnect", (reason, details) => {
      console.log('disconnected for socketid-appid ' + socket.id + '-' + instrument.appid + '-' + reason + '-' + JSON.stringify(details));
    });

    socket.on('futuresPreData', (fQuotes) => {
      setFuturesChart(fQuotes);
    });

    socket.on('qdeltastrikes', (uQuotes, peQuotes, ceQuotes) => {
      setUpInitialNiftyChart(uQuotes);
      setUpInitialOptionsChart(peQuotes, ceQuotes, instrument.oExpiry); 
    });

    socket.on('index', (q) => 
    {
      qBox.dispatchEvent(generateEvent('index', q));
    
      if(q.exchange === 'MCX')
        futuresQuote(q);

      var lt = new Date(q.ltt);
      time_label.innerText = lt.toLocaleTimeString();
      spot_label.innerText = q.close.toFixed(2);
    });
    
    socket.on('vix', (q) => {
      if(q !== undefined) 
        qBox.dispatchEvent(generateEvent('vix', q));
    });

    socket.on('futures', (q) => {    
      futuresQuote(q);
    });

    socket.on('strikex', (q) => {
        qBox.dispatchEvent(generateEvent('strikex', q));
    });

    socket.on('orderbook', (response) => {
      loadOrders(response);
    });

    socket.on('order', (exorder) => {
      console.log("ws order message " + JSON.stringify(exorder));
      
      if(exorder.appid !== instrument.appid)
        return;
      
      var p = Position.findPosition(exorder.symbol, true);
      p.orderupdate(exorder, false);
    });

    socket.on('hb', (resp) => {
      if(resp.order_socket === 1)
        socn.style.backgroundColor = '#4CAF50';
      else
        socn.style.backgroundColor = '#f44336';
    });

    socket.on('cn', (msg) => {
      console.log("connection message " + msg)  
      socn.style.backgroundColor = '#4CAF50';
    });
  } catch(error){
    console.log(error);
  }
}