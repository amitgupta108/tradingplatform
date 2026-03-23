let serverTime = 0;
var uQuoteGl;
var orderresponses = new Array(0);

socket = io(`https://localhost:${window.location.port}`, {
  extraHeaders: {
    "uid": uuid
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
    if(response === uuid)
      document.getElementById("btnResumeSim").disabled = false;
  });

  socket.on('futuresPreData', (fQuotes) => {
    setFuturesChart(fQuotes);
  });

  socket.on('qdeltastrikes', (uQuotes, peQuotes, ceQuotes) => {
    setUpInitialNiftyChart(uQuotes);
    setUpInitialOptionsChart(peQuotes, ceQuotes, instrument.oExpiry); 
    document.getElementById("btnStartSim").disabled = false;
  });

  socket.on('index', (q) => {
    console.log("index:  " + JSON.stringify(q));
    serverTime = q.ltt;
    var lt = new Date(q.ltt);
    
    if(q.stock_code === 'INDVIX')
      IVSeries.update({"time": lastCandle.time, "value": q.close});
    else
    {
      timerText.innerHTML = lt.toDateString() + ", " + lt.toLocaleTimeString() + " |   Spot: " + q.close.toFixed(2) + " |   ATM: " + optionChains[0].atm;
      uQuoteGl = q;  
      //updateIndexChart(q);

      if (Math.abs(optionChains[0].atm - uQuoteGl.close) > 60)
        optionChains[0].atm = Math.round(uQuoteGl.close / 50) * 50;
    }
  });

  socket.on('futures', (fQuote) => 
  {    
    if(fQuote != undefined)
    {
      updateFuturesChart(fQuote);
      //updateFuturesTable(fQuote);
      document.title = "Nifty Futures " + fQuote.close.toFixed(2);
    }
  });

  socket.on('strikex', (q) => {
    console.log("strikex:  " + JSON.stringify(q));
    try {
      OptionChain.update(q);
      setPositionQuote(q);
      writeProfitLoss();
      //setChartQuotes(optionChainQuotes);
      //updateOptionsChart();  
    } catch(error) {
      console.log(error);
    }
  });
  
  socket.on('orderconf', (response) => {
    console.log("order status:  " + JSON.stringify(response));
    orderresponses.push(response);
    
    for(var i = 0; i < positions.length; i++)
    {
      var openorders = positions[i].findorders('opened');
      for(var j = 0; j < openorders.length; j++)
      {
        orderresponses.map((e) => {
          if (e.counter === openorders[j].counter)
          {
            e.matched = true;
            openorders[j].matched = true;
            if(e.status === 'success')
              openorders[j].state = 'accepted';
            else
              openorders[j].state = 'rejected';
            openorders.orderid = orderresponses.orderid;
          }
        });
      }
    }    
    updateOrder(response);
  });

  socket.on('order', (omsg) => {
    console.log("order message " + omsg)

    var p = positions.map((e) => {
      e.orders.map((o => {
        if(o.state === 'accepted' && omsg.orderid === o.orderid)
        {
          o.state = 'completed';
          o.exprice = omsg.ltp;
          o.ltt = omsg.time;
        }
      }));
    }); 
  });

  socket.on('position', (pmsg) => {
    console.log("position message " + pmsg)
    var sp = pmsg.data;
    positions.map((p) => {
      if(p.symbol === sp.symbol){
        p.value(p.psize === (sp.flBuyQty - sp.ftSellQty) ? 1 : 0);
      }
    });
  });
}
