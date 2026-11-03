/**
 * OpenAlgo Strategy Module for TradingView Integration
 * https://docs.openalgo.in
 */

import axios from 'axios';

class Strategy {
    /**
     * Initialize strategy with host URL and webhook ID
     * 
     * @param {string} hostUrl - OpenAlgo server URL (e.g., "http://127.0.0.1:5000")
     * @param {string} webhookId - Strategy's webhook ID from OpenAlgo
     */
    constructor(hostUrl, webhookId) {
        this._hostUrl = hostUrl.replace(/\/+$/, ''); // Remove trailing slashes
        this._webhookId = webhookId;
        this._webhookUrl = null;
    }

    /**
     * Get webhook URL, cached to avoid reconstructing it every time
     * 
     * @returns {string} Full webhook URL
     */
    get webhookUrl() {
        if (!this._webhookUrl) {
            this._webhookUrl = `${this._hostUrl}/strategy/webhook/${this._webhookId}`;
        }
        return this._webhookUrl;
    }

    /**
     * Send a strategy order via webhook to OpenAlgo.
     * The strategy mode (LONG_ONLY, SHORT_ONLY, BOTH) is configured in OpenAlgo.
     * 
     * @param {Object} params - Strategy order parameters
     * @param {string} params.symbol - Trading symbol (e.g., "RELIANCE", "NIFTY")
     * @param {string} params.action - Order action ("BUY" or "SELL")
     * @param {number} [params.positionSize] - Position size, required for BOTH mode
     * @returns {Promise<Object>} Response from the webhook request
     * @throws {Error} If the webhook request fails
     */
    async strategyOrder({ symbol, action, positionSize }) {
        // Prepare message
        const postMessage = {
            symbol,
            action: action.toUpperCase()
        };
        
        if (positionSize !== undefined) {
            postMessage.position_size = String(positionSize);
        }
        
        try {
            const response = await axios.post(this.webhookUrl, postMessage);
            return response.data;
        } catch (error) {
            console.error(`Strategy order failed: ${error.message}`);
            throw error;
        }
    }
}

export default Strategy;
