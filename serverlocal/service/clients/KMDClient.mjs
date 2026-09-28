
import { PacketParser } from '../../utils/PacketParser.mjs';
import { SocketClient } from './socketclient.mjs';

export class KMDClient extends SocketClient 
{
    constructor(options) {
        super('KMDCLIENT', options);
        this.dividers = null;
    }

    initiateConnect(authData) {
        this.authData = authData;
        return this.connect(this.authData.feedUrl, 'node');
    }

    onOpen() {
        this.authenticate();
        this.ws.binaryType = 'arraybuffer';
    }

    authenticate() {
        const authPayload = {
            user: process.env.kotak_ucc,
            auth: this.authData.hsi_sid,
            format: 'native_batch',
            source: 'NEOTRADEAPI',
        }
        this.sendMessage(JSON.stringify(authPayload));
        this.log('Authentication request sent');
    }

    handleMessage(event) 
    {
        try 
        {
            const data = event.data;
            if (typeof data !== 'string' && data instanceof ArrayBuffer) {
                const packets = PacketParser.splitBatch(Buffer.from(data));
                for (const packet of packets) {
                    const message = PacketParser.decodePacket(packet, this.dividers);
                    if (message)
                        this.handleResponse(message);
                }
                return;
            }
            const input = typeof data === 'string' ? data : data.toString('utf8');
            this.handleResponse(JSON.parse(input));
        }
        catch (error) {
            this.log('Error handling message:', error);
        }
    }

    handleResponse(parsed)
    {
        if (parsed?.type === 'scrip' || parsed?.type === 'index')
            this.emit('quote', parsed);
        else if (parsed?.type === 'scrip_lite')
            this.emit('quote', parsed);
        else if (parsed.message_code === 1117 || parsed.message_code === 1119)
            this.dividers = parsed.exchanges;
        else
            this.log('Parsed message:', JSON.stringify(parsed));
    }

    // ==================== PUBLIC API ====================
    snapshot(scrips, type = '', lite = false) {
        const scripStr = Array.isArray(scrips) ? scrips.join(',') : scrips;
        this.log('Requesting scrip snapshot:', scripStr);
        const request = {
            event: 'snapshot' + type + (lite ? 'Lite' : ''),
            inputtoken: scripStr,
        }
        this.sendMessage(JSON.stringify(request));
    }

    subscribe(scrips, type = '', action, lite = false) {
        const scripStr = Array.isArray(scrips) ? scrips.join(',') : scrips;
        const event = (['subs', 'subscribe'].includes(action) ? 'subscribe' : 'unsubscribe') + type + (lite ? 'Lite' : '');
        this.log('Subscribe scrips:', event + ' ' + scripStr);
        const request = {
            event: event,
            inputtoken: scripStr,
        }
        this.sendMessage(JSON.stringify(request));    
    }
}