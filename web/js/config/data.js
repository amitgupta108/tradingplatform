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
let profile = null;

async function loadProfile() {

	const response = await fetch(`https://127.0.0.1:1031/api/profile?key=${id}`, {
		method: 'GET', targetAddressSpace: 'loopback'
	});

	if (response.ok) {
		profile = await response.json();

		profile.simStartTime = ((profile.simStartTime ?
			new Date(profile.simStartTime).getTime() : Math.round(Date.now() / 1000) * 1000)) + 5.5 * 60 * 60 * 1000;

		date_label.textContent = new Date(profile.simStartTime).toDateString();
		expiry_btn_1.textContent = profile.oExpiries[0];
		expiry_btn_2.textContent = profile.oExpiries[1];

		if (optionChains.findIndex((oc) => oc.expiry === profile.oExpiries[0]) === -1)
			var c_option_chain = new OptionChain(profile.oExpiries[0], 'c_oc_div');

		if (optionChains.findIndex((oc) => oc.expiry === profile.oExpiries[1]) === -1)
			var n_option_chain = new OptionChain(profile.oExpiries[1], 'n_oc_div');
	}
}

loadProfile();