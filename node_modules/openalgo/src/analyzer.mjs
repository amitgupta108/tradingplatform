/**
 * OpenAlgo REST API - Analyzer Methods
 * https://docs.openalgo.in
 */

import BaseAPI from './base.mjs';

class AnalyzerAPI extends BaseAPI {
    /**
     * Analyzer API methods for OpenAlgo.
     * Inherits from the BaseAPI class.
     */

    /**
     * Get analyzer mode status and statistics.
     *
     * @returns {Promise<Object>} JSON response containing analyzer status
     * @example
     * const response = await client.analyzerstatus();
     * console.log(response);
     * // Output: { status: 'success', data: { analyze_mode: true, mode: 'analyze', total_logs: 2 } }
     */
    async analyzerstatus() {
        const url = `${this.baseUrl}analyzer`;
        const payload = {
            apikey: this.apiKey
        };
        return this._post(url, payload);
    }

    /**
     * Toggle analyzer mode on or off.
     *
     * @param {Object} params - Request parameters
     * @param {boolean} params.mode - True to enable analyze mode, false to disable
     * @returns {Promise<Object>} JSON response containing updated analyzer status
     * @example
     * // Enable analyzer mode
     * const response = await client.analyzertoggle({ mode: true });
     * console.log(response);
     *
     * // Disable analyzer mode
     * const response = await client.analyzertoggle({ mode: false });
     * console.log(response);
     */
    async analyzertoggle({ mode }) {
        const url = `${this.baseUrl}analyzer/toggle`;
        const payload = {
            apikey: this.apiKey,
            mode: mode
        };
        return this._post(url, payload);
    }
}

export default AnalyzerAPI;
