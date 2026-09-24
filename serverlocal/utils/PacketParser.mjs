export const HEADER_SIZE = 9;
export const DEFAULT_DIVIDER = 100;
export const MESSAGE_CODES = { 
    CAS_CHANGE: 104, 
    MARKET_STATUS: 105, 
    MARKET_OPEN: 6511, 
    MARKET_CLOSE: 6521, 
    INDEX: 7207 
};

const MARKET_STATUS_TEXT = {
    1: 'Market open', 2: 'Market closed', 3: 'Pre-open session ending',
    4: 'Pre-open ended, normal market open', 5: 'Auction status changed',
    6: 'Closing session started', 7: 'Closing session ended',
    8: 'Continuous trading closed, closing auction starting soon',
    9: 'Closing auction price band set', 10: 'Closing auction (CAS) started',
    11: 'Market orders restricted', 12: 'Closing auction (CAS) ended',
};

const exchangeNames = { 
    0: 'none', 
    1: 'nse_cm', 
    2: 'nse_fo', 
    3: 'cde_fo', 
    4: 'nse_com', 
    5: 'bse_cm',
    6: 'bse_fo', 
    7: 'bse_cd', 
    8: 'bse_co', 
    9: 'mcx_fo', 
    10: 'ncd_co' 
};

const int64 = (buffer, offset) => Number(buffer.readBigInt64LE(offset));
const uint64 = (buffer, offset) => Number(buffer.readBigUInt64LE(offset));
const text = (buffer, offset, length) => buffer.subarray(offset, offset + length).toString('utf8').split('\0', 1)[0].trim();


export class PacketParser 
{
    static splitBatch(frame) 
    {
        const packets = [];
        let offset = 0;
        while (offset + 2 <= frame.byteLength) {
            const size = frame.readUInt16LE(offset);
            if (size < HEADER_SIZE || offset + size > frame.byteLength)
                break;
            packets.push(frame.subarray(offset, offset + size));
            offset += size;
        }
        return packets;
    }

    static decodePacket(packet, dividers) 
    {
        if (packet.length < HEADER_SIZE)
            return undefined;

        const messageCode = packet.readUInt16LE(2);
        const exchangeId = packet.readInt8(4);
        const level = packet.readUInt8(5);
        const auctionFlag = packet.readUInt8(6);
        const exchange = exchangeNames[exchangeId] ?? String(exchangeId);
        const divider = dividers[exchange]['divider'] || DEFAULT_DIVIDER;

        if (messageCode === MESSAGE_CODES.MARKET_OPEN || messageCode === MESSAGE_CODES.MARKET_CLOSE) 
        {
            const statusCode = messageCode === MESSAGE_CODES.MARKET_OPEN ? 1 : 2;
            return { 
                type: 'market_status', 
                exchange_segment: exchange, 
                status_code: statusCode, 
                status: MARKET_STATUS_TEXT[statusCode] 
            };
        }

        if (messageCode === MESSAGE_CODES.INDEX)
            return this.decodeIndex(packet, exchange, divider);

        if (messageCode === MESSAGE_CODES.MARKET_STATUS)
            return this.decodeMarketStatus(packet, exchange);

        if (messageCode === MESSAGE_CODES.CAS_CHANGE)
            return this.decodeCasChange(packet, exchange, divider);

        if (level === 1)
            return this.decodeMini(packet, exchange, divider);

        if ([2, 4, 8, 16].includes(level))
            return this.decodeMarketPicture(packet, exchange, divider, level, auctionFlag);

        return undefined;
    }

    static decodeIndex(packet, exchange, divider) 
    {
        let offset = HEADER_SIZE;
        const token = packet.readUInt32LE(offset);
        offset += 4;
        const open = packet.readInt32LE(offset);
        offset += 4;
        const close = packet.readInt32LE(offset);
        offset += 4;
        const high = packet.readInt32LE(offset);
        offset += 4;
        const low = packet.readInt32LE(offset);
        offset += 4;
        const value = packet.readInt32LE(offset);
        offset += 4;
        const lastTradeTime = uint64(packet, offset);
        offset += 8;
        const yearlyHigh = packet.readInt32LE(offset);
        offset += 4;
        const yearlyLow = packet.readInt32LE(offset);
        offset += 4;
        const percent = packet.readInt32LE(offset);
        offset += 4;
        const _market_cap = packet.readDoubleLE(offset);
        offset += 8;
        const precision = packet.readUInt8(offset);
        offset += 1;
        const multiplier = packet.readUInt32LE(offset);
        offset += 4;
        const name =  text(packet, offset, 21);

        return { 
            type: 'index',
            exchange: exchange,
            token: name,
            name: String(token), 
            ltp: value / divider, 
            open: open / divider, 
            high: high / divider, 
            low: low / divider, 
            close: close / divider, 
            change: (value - close) / divider, 
            change_percent: percent / 100, 
            yh: yearlyHigh / divider, 
            yl: yearlyLow / divider, 
            ltt: lastTradeTime, 
            precision, 
            multiplier: multiplier / divider 
        };
    }

    static decodeMarketStatus(packet, exchange) 
    { 
        const statusCode = packet.readUInt16LE(HEADER_SIZE); 
        return { 
            type: 'market_status', 
            exchange: exchange, 
            status_code: statusCode, 
            status: MARKET_STATUS_TEXT[statusCode] ?? (text(packet, HEADER_SIZE + 2, 5) || `Unknown status_code ${statusCode}`) 
        }; 
    }

    static decodeCasChange(packet, exchange, divider) 
    { 
        const token = packet.readUInt32LE(HEADER_SIZE);
        const refPrice = packet.readUInt32LE(HEADER_SIZE + 4);
        const imbalance = int64(packet, HEADER_SIZE + 8);
        const imbalanceAtMarket = int64(packet, HEADER_SIZE + 16); 
        
        if (refPrice === 0 && imbalance === 0 && imbalanceAtMarket === 0)
            return undefined; 
        
        return { 
            type: 'cas_change', 
            exchange: exchange, 
            token: String(token), 
            ref_price: refPrice / divider, 
            imbalance_qty: imbalance, 
            imbalance_qty_at_market: imbalanceAtMarket 
        }; 
    }

    static decodeMini(packet, exchange, divider) 
    { 
        let offset = HEADER_SIZE; 
        const token = packet.readUInt32LE(offset); 
        offset += 4; 
        const lastTradeTime = int64(packet, offset); 
        offset += 8; 
        const lastPrice = packet.readInt32LE(offset); 
        offset += 4; 
        const lastQty = int64(packet, offset); 
        offset += 8; 
        const close = packet.readInt32LE(offset); 
        offset += 4; 
        const percent = packet.readInt32LE(offset); 
        offset += 4; 
        const change = packet.readInt32LE(offset); 
        offset += 4; 
        const lot = packet.readUInt32LE(offset); 
        offset += 4; 
        const precision = packet.readUInt8(offset); 
        offset += 1; 
        const multiplier = packet.readUInt32LE(offset); 
        
        return { 
            type: 'scrip_lite', 
            exchange: exchange, 
            token: String(token), 
            ltp: lastPrice / divider, 
            ltt: lastTradeTime, 
            //ltq: lastQty, 
            //close: close / divider, 
            //change: change / divider, 
            //change_percent: percent / 100, 
            //lot_size: lot, 
            //precision, 
            //multiplier 
        }; 
    }

    static decodeMarketPicture(packet, exchange, divider, level, auctionFlag) 
    { 
        let offset = HEADER_SIZE; 
        const token = packet.readUInt32LE(offset); 
        offset += 4; 
        const totalBuy = int64(packet, offset); 
        offset += 8; 
        const totalSell = int64(packet, offset); 
        offset += 8; 
        const volume = int64(packet, offset); 
        offset += 8; 
        const lastTradeTime = int64(packet, offset); 
        offset += 8; 
        let lastUpdateTime = int64(packet, offset); 
        offset += 8; 
        const open = packet.readUInt32LE(offset); 
        offset += 4; 
        const close = packet.readUInt32LE(offset); 
        offset += 4; 
        const high = packet.readUInt32LE(offset); 
        offset += 4; 
        const low = packet.readUInt32LE(offset); 
        offset += 4; 
        const lastPrice = packet.readUInt32LE(offset); 
        offset += 4; 
        const lastQty = int64(packet, offset); 
        offset += 8; 
        const average = packet.readUInt32LE(offset); 
        offset += 4; 
        offset += 4; 
        const buyCount = packet.readUInt32LE(offset);	
        offset += 4;	
        const sellCount = packet.readUInt32LE(offset);	
        offset += 4; offset += 2;
        const percent =	packet.readInt32LE(offset);
        offset	+=	4;
        const openInterest	= packet.readUInt32LE(offset);
        offset  +=	4;
        const totalValue =	packet.readDoubleLE(offset);
        offset  +=	8;
        const change =	packet.readInt32LE(offset);
        offset	+=	4;
        const upper	=	packet.readUInt32LE(offset);
        offset	+=	4;
        const lower	= packet.readUInt32LE(offset);
        offset	+=	4;
        const yearlyHigh = packet.readUInt32LE(offset);
        offset	+=	4;
        const yearlyLow	= packet.readUInt32LE(offset);
        offset += 4;
        const lot = packet.readUInt32LE(offset);
        offset	+=	4;
        const precision = packet.readUInt8(offset); 
        offset += 1; 
        const multiplier = packet.readUInt32LE(offset); 
        
        if (lastUpdateTime < 0)
            lastUpdateTime = 0;

        const rowCounts = level === 4 ? [1, 1] : [buyCount, sellCount];
        const buy = [], sell = [];
        
        for (let index = 0; index < rowCounts[0] + rowCounts[1] && offset + 16 <= packet.length; index += 1) 
        {
            const row = { 
                quantity: int64(packet, offset), 
                price: packet.readInt32LE(offset + 8) / divider, 
                orders: packet.readInt32LE(offset + 12) 
            };
            
            (index < rowCounts[0] ? buy : sell).push(row);
            offset += 16;
        } 
        
        return { 
            type: 'scrip', 
            exchange: exchange, 
            token: String(token), 
            level, 
            ltp: lastPrice / divider, 
            open: open / divider,
            high: high / divider,
            low: low / divider, 
            close: close / divider, 
            atp: average / divider, 
            ltt: lastTradeTime, 
            lut: lastUpdateTime, 
            ltq: lastQty,
            tbq: totalBuy, 
            tsq: totalSell, 
            volume: volume, 
            oi: openInterest, 
            change: change / divider, 
            change_percent: percent / 100, 
            ucl: upper / divider, 
            lcl: lower / divider, 
            yh: yearlyHigh / divider, 
            yl: yearlyLow / divider, 
            ttv: totalValue / divider, 
            lot_size: lot, 
            precision, 
            multiplier, 
            auction: auctionFlag > 0, 
            buy, 
            sell 
        }; 
    }
}