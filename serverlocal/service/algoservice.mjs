import {eventservice} from './eventservice.mjs'
import { ConfigService as config, ConfigService } from './.config/configservice.mjs';

class AlgoService
{
    constructor(name, market_service, trade_service)
    {
        this.name = name;
        this.initialized = false;
        this.m_s = ConfigService.getServiceByName(market_service);
        this.t_s_name = trade_service;
        this.counter = 50000;
        this.orders = new Map();
    }

    init() 
    {
        if (!this.initialized) 
        {
            if(this.m_s !== undefined)
            {
                const eventname = this.m_s.registerPriceFeed();
                eventservice.addListener(eventname, (q) => {
                    this.quoteEvent(eventname, q);
                });
            }
            if(this.t_s_name !== undefined)
            {
                eventservice.addListener('position', (servicename, position) => {
                    if(this.t_s_name === servicename)
                        this.positionEvent(position);
                })
            }

            this.initialized = true;
            return { status: 'success' }
        }
    }

    quoteEvent(view_mode, q) 
    {
        const deployed = Strategy.getStrategies(strategystate.deployed);
        for (const dep of deployed)
        {
            dep.quoteEvent(q);
        }
    }

    positionEvent(p) 
    {
        
        if(process.env.auto_deploy = 'Y' && p.quantity > 1)
        {
            const partial_exit = Strategy.PARTIAL_EXIT.deploy(p.symbol, !p.action);
        }
    }
}

export const algoservice = new AlgoService('ALGOSERVICE', 'KOTAKLIVEVIEW', 'KOTAKNEOTRADE');


const trigger = {
    type: triggertype.price,
    value: 0
}

const triggertype = Object.freeze({
    price: 'price',
    pnl: 'pnl',
    time: 'time_ms',
    duration: 'duration_ms',
    external: 'external'
});

const strategytype = {
    auto: 'auto',
    manual: 'manual'
}

const strategystate = Object.freeze({
    initial: 'initial',
    created: 'created',
    deployed: 'deployed',
    invalid: 'invalid'
});

class Strategy
{
    static strategy_map = new Map();
    
    static PARTIAL_EXIT = this.create('PARTIAL_EXIT', strategytype.auto, 
            [StrategyLeg.create('LIMIT_EXIT', triggertype.price)]);
    
    constructor(name, type)
    {
        this.self = this;
        this.name = name;
        this.state = strategystate.initial;
        this.type = type;
        this.id;
        this.legs = [];
    }

    static create(name, type, legs) 
    {
        const s = new Strategy(name, type);
        s.id = 1000;
        s.legs = legs;

        return s;
    }

    static get(id) 
    {
        return Strategy.strategy_map.get(id);
    }

    deploy(symbol, action)
    {
        if(this.state === strategystate.created){
            for (const leg of this.legs){
                leg.activate(symbol, action);
            }
            this.state = strategystate.deployed;
        }
        else 
        {
            throw new Error('strategy not deployable ' + this.state);
        }
    }

    quoteEvent(q)
    {

    }
}

class StrategyLeg
{
    constructor(name, triggertype)
    {
        this.name = name;
        this.triggertype = triggertype;
        this.state = 'incomplete';
        this.symbol;
        this.action;
    }

    static create(name, triggertype)
    {
        return new StrategyLeg(name, triggertype);
    }

    activate(symbol, action)
    {
        this.symbol = symbol;
        this.action = action;
        this.state = 'activated';
    }
}