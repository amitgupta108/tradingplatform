const client_clocks = new Map();
const client_store = new Map();
const subsRequests = new Map();

const streamers = [
    { key: '1x', speed: 1, qsid: 0, state: 'stopped' },
    { key: '2x', speed: 2, qsid: 0, state: 'stopped' },
    { key: '3x', speed: 3, qsid: 0, state: 'stopped' },
    { key: '5x', speed: 5, qsid: 0, state: 'stopped' },
    { key: '10x', speed: 10, qsid: 0, state: 'stopped' },
];

export const simstate = {
    clocks: client_clocks,
    qs_store: client_store,
    subs_reqs: subsRequests,
    streamers: streamers
};