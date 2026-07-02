let socket;

function connect()
{
  socket = io(`https://localhost:${window.location.port}`, {
    auth: {
      token: instrument.appid,
      mode: instrument.mode,
      stockCode: instrument.stockCode
    },
    reconnection: false,
    timeout: 20000
  });

  rh(socket);
}

/*--------------------------------------------------------------------------------------------------------------------------------*/
function rh(socket)
{  
  try{
    socket.on("connect", () => {
      console.log('socket connected for appid' + socket.id + '-' + instrument.appid + '-' + socket.recovered);
      data_reload = false;
      bottom_btns[0].disabled = true;
      bottom_btns[1].disabled = false;
      bottom_btns[3].disabled = false;
      bottom_btns[4].disabled = false;
      bottom_btns[5].disabled = false;

      if(instrument.mode === 'HISTORY')
        document.getElementById('optionSpeed').disabled = false;
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

    socket.on("disconnect", (reason) => {
      bottom_btns[0].disabled = false;
      console.log('disconnected for socketid-appid ' + socket.id + '-' + instrument.appid + '-' + reason);
    });
    
    socket.on('history', (key, quotes) => {
      const withEma = ['futures', 'index'].includes(key) ? true : false;
      setInitialChart(key, withEma , quotes);
    });
  
    socket.on('index', (q) => {
      qBox.dispatchEvent(generateEvent('index', q));
    });
    
    socket.on('vix', (q) => {
      qBox.dispatchEvent(generateEvent('vix', q));
    });

    socket.on('futures', (q) => {    
      qBox.dispatchEvent(generateEvent('futures', q));
      if(q.exchange === 'MCX')
        qBox.dispatchEvent(generateEvent('index', q));      
    });

    socket.on('strikex', (q) => {
        qBox.dispatchEvent(generateEvent('strikex', q));
    });

    socket.on('stream', (response) => {
      if(response === 'paused')
        document.getElementById('btnStopSim').innerText = 'Resume';
      else if(response === 'resumed')
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

    socket.on('orderbook', (response) => {
      loadOrders(response);
    });

    socket.on('order', (exorder) => {
      if(exorder.appid !== instrument.appid)
        return;
      
      var p = Position.findPosition(exorder.symbol, true);
      p.orderupdate(exorder, false);
    });

    socket.on('hb', (resp) => {
      if(resp?.order_socket === 1)
        socn.style.backgroundColor = '#4CAF50';
      else
        socn.style.backgroundColor = '#f44336';
    });

    socket.on('wsOps', (action, resp) => {
      if(action === 'open' && resp.status === 'success')
        socn.style.backgroundColor = '#4CAF50';
      else if(action === 'close' && resp.status === 'success')
        socn.style.backgroundColor = 'white';
    });

    socket.on('live_trading', (locked) => {
      if(!locked)
        ws_start_btn.style.backgroundColor = '#4CAF50';
    });

  } catch(error){
    console.log(error);
  }
}