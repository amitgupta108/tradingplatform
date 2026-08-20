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

const symbol_cache = new Map();
const regex = /[0-9]/;
function expandSymbol(symbol)
{
  let s = symbol_cache.get(symbol);
  if(s === undefined) {
    const idx = symbol.search(regex);

    s = { stockCode: idx === -1 ? symbol : symbol.slice(0, idx)};
    s.right = symbol.slice(-2);
    s.expiry_date = symbol.slice(idx, idx + 7);
    s.strike_price = symbol.slice(idx + 7, -2);
    s.key = symbol.endsWith('FUT') ? 'futures' : symbol.endsWith('PE') || symbol.endsWith('CE') ? 'strikex' : 'index';
    s.name = s.expiry_date + ' ' + s.strike_price + ' ' + s.right;
    symbol_cache.set(symbol, s);
  }
  return s;
}

function generateEvent(type, nv)
{
  return new CustomEvent(type, {

    detail: nv,
    //bubbles: true,   // Allow the event to bubble up the DOM
    //cancelable: true // Allow event.preventDefault()
  });
}

function qSel(element, name, type){
  type = type === 'id' ? '#' : type === 'css' ? '.' : '';
  return element.querySelector(type + name);
}