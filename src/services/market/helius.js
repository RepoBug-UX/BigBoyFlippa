const axios = require('axios');
const config = require('../../core/config');
const logger = require('../../core/utils/logger');

class HeliusService {
    constructor() {
        this.apiKey = config.get('HELIUS_API_KEY');
        this.baseUrl = config.get('HELIUS_API_URL', 'https://api.helius.xyz/v0');
    }

    async getTokenMetadata(mintAddress) {
        try {
            const response = await axios.post(`${this.baseUrl}/token-metadata`, {
                mintAccounts: [mintAddress]
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.data[0];
        } catch (error) {
            logger.error('Error fetching token metadata:', error.message);
            throw error;
        }
    }

    async getTokenPrice(mintAddress) {
        try {
            const response = await axios.get(`${this.baseUrl}/token-price`, {
                params: { mintAddress },
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.data.price;
        } catch (error) {
            logger.error('Error fetching token price:', error.message);
            throw error;
        }
    }

    async getTokenHolders(mintAddress) {
        try {
            const response = await axios.get(`${this.baseUrl}/token-holders`, {
                params: { mintAddress },
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return response.data.holders;
        } catch (error) {
            logger.error('Error fetching token holders:', error.message);
            throw error;
        }
    }
}

module.exports = new HeliusService(); 