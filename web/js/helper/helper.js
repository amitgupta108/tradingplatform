const STRIKE_SIZE = {
  NIFTY: 50,
  CRUDEOIL: 50
}

const scrip_cache = new Map();
const regex = /[0-9]/;
function getScrip(symbol) {
  let s = scrip_cache.get(symbol);
  if (s === undefined) {
    const idx = symbol.search(regex);

    s = { stockCode: idx === -1 ? symbol : symbol.slice(0, idx) };
    s.right = symbol.slice(-2);
    s.expiry = symbol.slice(idx, idx + 7);
    s.strike = symbol.slice(idx + 7, -2);
    s.key = symbol.endsWith('FUT') ? 'futures' : symbol.endsWith('PE') || symbol.endsWith('CE') ? 'strikex' : 'index';
    s.name = s.expiry + ' ' + s.strike + ' ' + s.right;
    s.symbol = symbol;
    scrip_cache.set(symbol, s);
  }
  return s;
}

function generateEvent(type, nv) {
  return new CustomEvent(type, {

    detail: nv,
    //bubbles: true,   // Allow the event to bubble up the DOM
    //cancelable: true // Allow event.preventDefault()
  });
}

function qSel(element, name, type) {
  type = type === 'id' ? '#' : type === 'css' ? '.' : '';
  return element.querySelector(type + name);
}