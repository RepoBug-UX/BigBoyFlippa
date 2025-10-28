const axios = require('axios');
const { Connection, PublicKey, Transaction, VersionedTransaction, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const config = require('../../core/config');
const logger = require('../../core/utils/logger');
const walletManager = require('../wallet/walletManager');

class JupiterService {
    constructor() {
        this.jupiterApi = 'https://quote-api.jup.ag/v6';
        this.walletManager = walletManager;
        this.initialized = false;
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
    }

    /**
     * Initializes the Jupiter service
     */
    async initialize() {
        try {
            // Ensure wallet manager is initialized first
            if (!this.walletManager.initialized) {
                await this.walletManager.initialize();
            }

            // Test connection to Jupiter API using quote endpoint
            const testQuote = await this.getBestRoute({
                inputMint: 'So11111111111111111111111111111111111111112', // SOL
                outputMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
                amount: '10000000', // 0.01 SOL in lamports
                slippage: 0.5
            });

            if (!testQuote) {
                throw new Error('Failed to get test quote from Jupiter API');
            }

            this.initialized = true;
            logger.info('Jupiter service initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Jupiter service:', error.message);
            throw error;
        }
    }

    /**
     * Ensures the service is initialized
     * @private
     */
    _ensureInitialized() {
        if (!this.initialized) {
            throw new Error('Jupiter service not initialized. Please call initialize() first.');
        }
        if (!this.walletManager.initialized) {
            throw new Error('Wallet manager not initialized. Please initialize wallet first.');
        }
    }

    /**
     * Gets the connection from wallet manager
     * @private
     */
    get connection() {
        this._ensureInitialized();
        return this.walletManager.connection;
    }

    /**
     * Retries an async function with exponential backoff
     * @private
     */
    async _retryWithBackoff(fn, retryCount = 0) {
        try {
            return await fn();
        } catch (error) {
            if (retryCount >= this.maxRetries) {
                throw error;
            }

            const delay = this.retryDelay * Math.pow(2, retryCount);
            logger.warn(`Retrying after ${delay}ms... (attempt ${retryCount + 1}/${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            return this._retryWithBackoff(fn, retryCount + 1);
        }
    }

    /**
     * Gets the best route for a token swap
     * @param {Object} params - Swap parameters
     * @param {string} params.inputMint - Input token mint address
     * @param {string} params.outputMint - Output token mint address
     * @param {number} params.amount - Amount in SOL
     * @param {number} params.slippage - Maximum slippage percentage
     * @returns {Promise<Object>} Best route information
     */
    async getBestRoute(params) {
        this._ensureInitialized();
        
        return this._retryWithBackoff(async () => {
            try {
                const { inputMint, outputMint, amount, slippage } = params;
                
                // Convert amount to lamports
                const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);
                
                logger.info(`Getting best route for swap: ${inputMint} -> ${outputMint}, amount: ${amount} SOL (${amountLamports} lamports)`);
                
                const response = await axios.get(`${this.jupiterApi}/quote`, {
                    params: {
                        inputMint,
                        outputMint,
                        amount: amountLamports.toString(),
                        slippageBps: Math.floor(slippage * 100),
                        onlyDirectRoutes: false,
                        asLegacyTransaction: false
                    }
                });

                if (!response.data || !response.data.data) {
                    throw new Error('Invalid route response from Jupiter API');
                }

                logger.info('Got route response:', response.data);
                return response.data;
            } catch (error) {
                if (error.response?.status === 429) {
                    throw new Error('Jupiter API rate limit exceeded');
                }
                if (error.response?.status === 400) {
                    throw new Error(`Invalid request: ${error.response.data?.message || error.message}`);
                }
                throw error;
            }
        });
    }

    /**
     * Gets swap transaction
     * @param {Object} params - Swap parameters
     * @param {Object} params.route - Route information from getBestRoute
     * @param {string} params.userPublicKey - User's public key
     * @returns {Promise<VersionedTransaction>} Prepared transaction
     */
    async getSwapTransaction(params) {
        this._ensureInitialized();

        return this._retryWithBackoff(async () => {
            try {
                const { route, userPublicKey } = params;

                logger.info('Getting swap transaction for route:', route);
                
                const swapResponse = await axios.post(`${this.jupiterApi}/swap`, {
                    quoteResponse: route,
                    userPublicKey,
                    wrapUnwrapSOL: true,
                    computeUnitPriceMicroLamports: 1000,
                    asLegacyTransaction: false
                });

                if (!swapResponse.data || !swapResponse.data.swapTransaction) {
                    throw new Error('Invalid swap response from Jupiter API');
                }

                logger.info('Got swap transaction');
                const serializedTx = Buffer.from(swapResponse.data.swapTransaction, 'base64');
                return VersionedTransaction.deserialize(serializedTx);
            } catch (error) {
                if (error.response?.status === 429) {
                    throw new Error('Jupiter API rate limit exceeded');
                }
                if (error.response?.status === 400) {
                    throw new Error(`Invalid swap request: ${error.response.data?.message || error.message}`);
                }
                throw error;
            }
        });
    }

    /**
     * Executes a swap transaction
     * @param {Object} params - Swap parameters
     * @returns {Promise<Object>} Swap result
     */
    async executeSwap(params) {
        this._ensureInitialized();
        
        try {
            const { inputMint, outputMint, amount, slippage } = params;
            
            // Validate parameters
            if (!inputMint || !outputMint || !amount) {
                throw new Error('Missing required parameters: inputMint, outputMint, amount');
            }

            // Check wallet balance before proceeding
            const balance = await this.walletManager.getBalance();
            if (balance < amount) {
                throw new Error(`Insufficient balance: ${balance} SOL < ${amount} SOL`);
            }
            
            // Get the best route first
            const route = await this.getBestRoute({
                inputMint,
                outputMint,
                amount,
                slippage: slippage || 0.5
            });

            // Get the swap transaction
            const transaction = await this.getSwapTransaction({
                route,
                userPublicKey: this.walletManager.getPublicKey().toString()
            });

            // Sign and send the transaction using wallet manager
            const signature = await this.walletManager.sendTransaction(transaction);
            
            // Calculate amounts in SOL
            const outAmountSol = route.outAmount / LAMPORTS_PER_SOL;
            const inAmountSol = amount;
            const price = outAmountSol / inAmountSol;
            
            logger.info(`Swap executed successfully: ${signature}`);
            logger.info(`Input: ${inAmountSol} SOL, Output: ${outAmountSol} SOL, Price: ${price}`);

            return {
                success: true,
                signature,
                txId: signature,
                amountOut: outAmountSol,
                price,
                route
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
        this._ensureInitialized();

        return this._retryWithBackoff(async () => {
            try {
                const response = await axios.get('https://price.jup.ag/v4/price', {
                    params: {
                        ids: tokenMint
                    }
                });

                if (!response.data?.data?.[tokenMint]?.price) {
                    throw new Error(`No price data available for token: ${tokenMint}`);
                }

                return response.data.data[tokenMint].price;
            } catch (error) {
                if (error.response?.status === 429) {
                    throw new Error('Jupiter API rate limit exceeded');
                }
                throw error;
            }
        });
    }

    /**
     * Gets token metadata
     * @param {string} tokenMint - Token mint address
     * @returns {Promise<Object>} Token metadata
     */
    async getTokenMetadata(tokenMint) {
        return this._retryWithBackoff(async () => {
            try {
                const response = await axios.get('https://token.jup.ag/all');
                const metadata = response.data[tokenMint];
                
                if (!metadata) {
                    throw new Error(`No metadata available for token: ${tokenMint}`);
                }

                return metadata;
            } catch (error) {
                if (error.response?.status === 429) {
                    throw new Error('Jupiter API rate limit exceeded');
                }
                throw error;
            }
        });
    }
}

// Export a singleton instance
const jupiterService = new JupiterService();
module.exports = jupiterService; 