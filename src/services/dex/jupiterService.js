const axios = require('axios');
const { Connection, PublicKey, Transaction } = require('@solana/web3.js');
const config = require('../../core/config');
const logger = require('../../core/utils/logger');
const WalletManager = require('../wallet/walletManager');

class JupiterService {
    constructor() {
        this.jupiterApi = 'https://lite-api.jup.ag/v6';
        this.walletManager = new WalletManager();
        this.connection = this.walletManager.connection;
    }

    /**
     * Gets the best route for a token swap
     * @param {Object} params - Swap parameters
     * @param {string} params.inputMint - Input token mint address
     * @param {string} params.outputMint - Output token mint address
     * @param {number} params.amount - Amount in lamports
     * @param {number} params.slippage - Maximum slippage percentage
     * @returns {Promise<Object>} Best route information
     */
    async getBestRoute(params) {
        try {
            const { inputMint, outputMint, amount, slippage } = params;
            
            const response = await axios.get(`${this.jupiterApi}/quote`, {
                params: {
                    inputMint,
                    outputMint,
                    amount,
                    slippageBps: slippage * 100,
                    onlyDirectRoutes: false
                }
            });

            return response.data;
        } catch (error) {
            logger.error('Failed to get best route:', error.message);
            throw error;
        }
    }

    /**
     * Gets swap transaction
     * @param {Object} params - Swap parameters
     * @param {string} params.route - Route information from getBestRoute
     * @param {string} params.userPublicKey - User's public key
     * @returns {Promise<Transaction>} Prepared transaction
     */
    async getSwapTransaction(params) {
        try {
            const { route, userPublicKey } = params;

            const response = await axios.post(`${this.jupiterApi}/swap`, {
                route,
                userPublicKey,
                wrapUnwrapSOL: true
            });

            return Transaction.from(Buffer.from(response.data.swapTransaction, 'base64'));
        } catch (error) {
            logger.error('Failed to get swap transaction:', error.message);
            throw error;
        }
    }

    /**
     * Executes a swap transaction
     * @param {Object} params - Swap parameters
     * @returns {Promise<Object>} Swap result
     */
    async executeSwap(params) {
        try {
            const { swapTransaction } = await this.getSwapTransaction(params);
            
            // Deserialize and execute the swap transaction
            const transaction = Transaction.from(Buffer.from(swapTransaction, 'base64'));
            const signature = await this.walletManager.signAndSendTransaction(transaction);
            
            logger.info(`Swap executed successfully. Signature: ${signature}`);
            
            // Get transaction details
            const txDetails = await this.walletManager.getTransactionDetails(signature);
            
            return {
                signature,
                status: 'success',
                details: txDetails
            };
        } catch (error) {
            logger.error('Failed to execute swap:', error.message);
            throw error;
        }
    }

    /**
     * Gets token price
     * @param {string} tokenMint - Token mint address
     * @returns {Promise<number>} Token price in SOL
     */
    async getTokenPrice(tokenMint) {
        try {
            const response = await axios.get(`${this.jupiterApi}/price`, {
                params: {
                    id: tokenMint
                }
            });

            return response.data.price;
        } catch (error) {
            logger.error('Failed to get token price:', error.message);
            throw error;
        }
    }

    /**
     * Gets token metadata
     * @param {string} tokenMint - Token mint address
     * @returns {Promise<Object>} Token metadata
     */
    async getTokenMetadata(tokenMint) {
        try {
            const response = await axios.get(`${this.jupiterApi}/token/${tokenMint}`);

            return response.data;
        } catch (error) {
            logger.error('Failed to get token metadata:', error.message);
            throw error;
        }
    }
}

module.exports = new JupiterService(); 