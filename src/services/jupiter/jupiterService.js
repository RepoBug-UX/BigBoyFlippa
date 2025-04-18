const { Jupiter } = require('@jup-ag/api');
const config = require('../../core/config');
const logger = require('../../core/utils/logger');

class JupiterService {
    constructor() {
        this.client = null;
        this.initialized = false;
    }

    async initialize(apiKey) {
        try {
            const jupiterConfig = {
                endpoint: 'https://quote-api.jup.ag/v6' // Use default endpoint
            };

            // Only add API key if provided
            if (apiKey) {
                jupiterConfig.apiKey = apiKey;
            }

            this.client = new Jupiter(jupiterConfig);

            // Test connection
            await this.verifyConnection();
            this.initialized = true;
            logger.info('Jupiter API client initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Jupiter API client:', error.message);
            throw error;
        }
    }

    async verifyConnection() {
        try {
            // Test connection by getting SOL price
            await this.client.getQuote({
                inputMint: 'So11111111111111111111111111111111111111112',
                outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                amount: 1000000000, // 1 SOL in lamports
                slippageBps: 50
            });

            return { connected: true };
        } catch (error) {
            logger.error('Jupiter API connection test failed:', error.message);
            return { connected: false, error: error.message };
        }
    }

    async getQuote(params) {
        if (!this.initialized) {
            throw new Error('Jupiter API client not initialized');
        }

        try {
            return await this.client.getQuote(params);
        } catch (error) {
            logger.error('Failed to get quote:', error.message);
            throw error;
        }
    }

    async executeSwap(params) {
        if (!this.initialized) {
            throw new Error('Jupiter API client not initialized');
        }

        try {
            return await this.client.executeSwap(params);
        } catch (error) {
            logger.error('Failed to execute swap:', error.message);
            throw error;
        }
    }

    async getTokenPrice(tokenMint) {
        if (!this.initialized) {
            throw new Error('Jupiter API client not initialized');
        }

        try {
            const quote = await this.client.getQuote({
                inputMint: 'So11111111111111111111111111111111111111112',
                outputMint: tokenMint,
                amount: 1000000000, // 1 SOL in lamports
                slippageBps: 50
            });

            return quote.outAmount / 1000000000; // Convert to SOL
        } catch (error) {
            logger.error('Failed to get token price:', error.message);
            throw error;
        }
    }
}

module.exports = new JupiterService(); 