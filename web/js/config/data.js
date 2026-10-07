window.addEventListener('unhandledrejection', function (event) {
  console.log(event.reason); 
  console.log(event.promise); 
  if (event.reason && event.reason.stack) {
    console.log(event.reason.stack);
  }
});

const LOT_SIZE = {
  NIFTY: 65,
  CRUDEOIL: 100,
  BANKNIFTY: 25 
};

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');
let instrument;

async function getAppid(id) {
  const response = await fetch(`https://0.0.0.0:1030/api/get?key=${id}`);
  if (response.ok) {
    instrument = await response.json();

    const simDate = new Date(instrument.simStartTime ?? Date.now());
    date_label.textContent = simDate.toDateString();
    expiry_btn_1.textContent = instrument.oExpiries[0];
    expiry_btn_2.textContent = instrument.oExpiries[1];
    
    if (optionChains.findIndex((oc) => oc.expiry === instrument.oExpiries[0]) === -1)
      var c_option_chain = new OptionChain(instrument.oExpiries[0], 'c_oc_div');

    if (optionChains.findIndex((oc) => oc.expiry === instrument.oExpiries[1]) === -1)
      var n_option_chain = new OptionChain(instrument.oExpiries[1], 'n_oc_div');
  }
  else
    console.log(response.statusText);
}

getAppid(id);