import service_breeze from '../broker/m_breeze.mjs';
import live_openalgo from '../broker/m_t_openalgo.mjs';
import live_kotak from '../broker/m_t_kotakneo.mjs';
import kotak_socket from './connectionmanager.mjs';
import paper_trading from './ordersimulator.mjs';

const modes = {
  HISTORY: {view: 'history', trade: 'simulated'},
  LIVELIVE: {view: 'live', trade: 'live'},
  LIVESIM: {view: 'live', trade: 'simulated'},
  LIVELIVEOA: {view: 'live', trade: 'live_2'},
  LIVELIVEADMIN: {view: 'live', trade: 'live', admin: 'live_trading'},
  LIVEADMIN: {view: 'live', admin: 'live_streaming'},
  ONLYADMIN: {admin: 'all'}
};

const providers = {
  view: {history: service_breeze, live: live_openalgo},
  trade: {live: live_kotak, live_2: live_openalgo, simulated: paper_trading},
  admin: {live_trading: kotak_socket, live_streaming: live_openalgo }
};

const access = {
  view: ['vix', 'start', 'predata', 'speed', 'stop', 'option_chain'],
  trade: ['order', 'cancelorder', 'orderbook'],
  admin: ['unlock_live', 'wsOps']
};

function initialize(mode)
{
  const services = modes[mode];
  if (services['view'] !==  undefined)
    providers['view'][services['view']].init();
  if(services['trade'] !== undefined)
    providers['trade'][services['trade']].init();
  if(services['admin'] !== undefined && services['admin'] !== 'all')
    providers['admin'][services['admin']].init();
  if(services['admin'] !== undefined && services['admin'] === 'all')
  {
    providers['admin'].live_streaming.init();
    providers['admin'].live_trading.init();
  }
}  

function getService(type, mode)
{
  if(type === 'vix')
    return service_breeze;

  const services = modes[mode];
  return providers[type][services[type]];
}

function getProfile(mode)
{
  return modes[mode];
}

function checkAccess(eventName, mode)
{
  const usertype = getProfile(String(mode));
  if(Object.hasOwn(usertype, 'view') && access['view'].includes(eventName))
    return true;
  else if(Object.hasOwn(usertype, 'trade') && access['trade'].includes(eventName))
    return true
  else if(Object.hasOwn(usertype, 'admin') && access['admin'].includes(eventName))
    return true;
  else 
    return false;
}

export default { initialize, getService, getProfile, checkAccess };