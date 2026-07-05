const STRIKE_SIZE = {
  NIFTY: 50,
  CRUDEOIL: 50
}

function convertDate(es)
{
  const shortDateFormat = new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
  });
  return shortDateFormat.format(new Date(es));
}

function getSymbol(q) {
  if (q.expiry_date !== undefined) {
    q.expiry_date = (q.expiry_date.replaceAll('-20', '').replaceAll('-', '')).toUpperCase();
    q.right = q.right_type !== undefined ? q.right_type : (q.right === 'Call' ? 'CE' : 'PE');
    return q.stock_code + q.expiry_date + q.strike_price + q.right;
  }
}

function expandSymbol(symbol)
{
    const regex = /[0-9]/;
    const idx = symbol.search(regex);
    const s = {};
    s.stockCode = idx === -1 ? symbol : symbol.slice(0, idx);

    s.right = symbol.slice(-2);
    s.expiry_date = symbol.slice(idx, idx + 7);
    s.strike_price = symbol.slice(idx + 7, -2);
    s.name = s.expiry_date + ' ' + s.strike_price + ' ' + s.right;
    return s;
}

function generateEvent(type, nv)
{
  return new CustomEvent(type, {

    detail: nv,
    bubbles: true,   // Allow the event to bubble up the DOM
    cancelable: true // Allow event.preventDefault()
  });
}

function qSel(element, name, type){
  type = type === 'id' ? '#' : type === 'css' ? '.' : '';
  return element.querySelector(type + name);
}

function toKotakOrder(order)
{    
    const symbol = order.symbol.slice(0, -2);
    const key = order.symbol.endsWith('PE') ? symbol.concat('.00PE') : symbol.concat('.00CE');
    const kotakOrder = {
        am: 'NO',
        dq: '0',
        es: order.exchange === 'NFO' ? 'nse_fo' : 'mcx_fo',
        mp: '6',
        pc: order.product,
        pf: 'N',
        pr: String(order.price),
        pt: order.pricetype === 'MARKET' ? 'MKT' : 'L',
        qt: String(order.quantity),
        rt: 'DAY',
        tp: '0',
        ts: key,
        tt: order.action === 'BUY' ? 'B' : 'S'
    };
    return kotakOrder;
}