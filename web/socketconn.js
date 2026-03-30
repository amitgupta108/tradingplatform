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
    setFuturesChart(fQuotes.quotes);
  });

  socket.on('qdeltastrikes', (uQuotes, peQuotes, ceQuotes) => {
    setUpInitialNiftyChart(uQuotes);
    setUpInitialOptionsChart(peQuotes, ceQuotes, instrument.oExpiry); 
    document.getElementById("btnStartSim").disabled = false;
  });

  socket.on('index', (q) => {
    //console.log("index:  " + JSON.stringify(q));
  
    //if(q.exchange === 'MCX')
      //futuresChart(q);
    
    uQuoteGl = q;  
    //updateIndexChart(q);

    optionChains.forEach((e) => {
      if(e.atm === undefined)
        e.atm = Math.round(q.close / 50) * 50;
    });

    var lt = new Date(q.ltt);
    timerText.innerHTML = lt.toDateString() + ", " + lt.toLocaleTimeString() + " |   Spot: " + q.close.toFixed(2) + " |   ATM: " + optionChains[0].atm;
  });

  socket.on('futures', (fQuote) => 
  {    
    if(fQuote != undefined)
    {
      futuresChart(fQuote);
      //updateFuturesTable(fQuote);
      document.title = fQuote.symbol + " " + fQuote.close.toFixed(2);
    }
  });

  socket.on('strikex', (q) => {
    //console.log("strikex:  " + JSON.stringify(q));
    try {
      
      var p = Position.findPositionRow(q.symbol);
      if(p != undefined) 
        refreshPositionPL(p, q.close) 
      
      OptionChain.update(q);
      //setChartQuotes(optionChainQuotes);
      //updateOptionsChart();  
    } catch(error) {
      console.log(error);
    }
  });
  
  socket.on('orderconf', (response) => {
    console.log("order status:  " + JSON.stringify(response));
    orderresponses.push(response);
    
    var p = positions.find((e) => e.symbol === response.symbol);
    
    response.state = response.status === 'success' ? 'submitted' : 'rejected';
    p.orders[response.orderN - 1] = response;
  });

  socket.on('simorder', (exorder) => {
    console.log("sim order message " + JSON.stringify(exorder));

    var p = positions.find((e) => e.symbol === exorder.symbol);
    p.orderupdate(exorder);
  });

  socket.on('order', (exorder) => {
    console.log("live order message " + JSON.stringify(exorder));
    
    /*
    var allorders = new Array(0);
    positions.forEach((p) => {
      allorders.concat(p.orders);
    })
    */

    var p = positions.find((e) => e.symbol === exorder.trdSym);
    p.liveorderupdate(exorder);
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
