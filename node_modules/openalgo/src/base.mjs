/**
 * OpenAlgo REST API - Base API Class
 * https://docs.openalgo.in
 */

import axios from 'axios';

class BaseAPI {
    /**
     * Initialize the API object with an API key and optionally a host URL and API version.
     * 
     * @param {string} apiKey - User's API key.
     * @param {string} [host="http://127.0.0.1:5000"] - Base URL for the API endpoints. Defaults to localhost.
     * @param {string} [version="v1"] - API version. Defaults to "v1".
     */
    constructor(apiKey, host = "http://127.0.0.1:5000", version = "v1") {
        this.apiKey = apiKey;
        this.baseUrl = `${host}/api/${version}/`;
        this.headers = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Internal method to make POST requests.
     * 
     * @param {string} url - The API endpoint URL
     * @param {Object} payload - The request payload
     * @returns {Promise<Object>} The API response
     * @protected
     */
    async _post(url, payload) {
        try {
            // Add additional security headers if needed
            const headers = {
                ...this.headers,
                'Authorization': `Bearer ${this.apiKey}` // Try adding an Authorization header
            };
            
            // Debug information for troubleshooting
            console.debug(`Sending request to: ${url}`);
            console.debug('Payload:', JSON.stringify(payload, null, 2));
            
            const response = await axios.post(url, payload, { headers });
            return response.data;
        } catch (error) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                console.error(`Error response from ${url}:`, error.response.status, error.response.data);
                return {
                    status: 'error',
                    message: `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`,
                    code: error.response.status,
                    error_type: 'http_error'
                };
            } else if (error.request) {
                // The request was made but no response was received
                console.error('No response received from server:', error.request);
                return {
                    status: 'error',
                    message: 'No response received from server',
                    error_type: 'network_error'
                };
            } else {
                // Something happened in setting up the request that triggered an Error
                return {
                    status: 'error',
                    message: error.message,
                    error_type: 'request_setup_error'
                };
            }
        }
    }
}

export default BaseAPI;
