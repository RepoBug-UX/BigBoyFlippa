const { PublicKey } = require('@solana/web3.js');
const config = require('../../core/config');
const logger = require('../../core/utils/logger');
const JupiterService = require('../../services/dex/jupiterService');
const RiskManager = require('../../services/risk/riskManager');
const smartFilter = require('../filtering/smartFilter');
const { TradeParams, TradeResult } = require('../../core/types');
const walletManager = require('../../services/wallet/walletManager');
const { Keypair } = require('@solana/web3.js');

class TradeExecutor {
    constructor() {
        this.jupiterService = new JupiterService();
        this.riskManager = new RiskManager();
        this.minLiquidity = config.get('MIN_LIQUIDITY', 100);
        this.maxHoldTime = config.get('MAX_HOLD_TIME_MS', 300000); // 5 minutes default
        this.tradeAmount = config.get('TRADE_AMOUNT_SOL', 0.1);
        this.maxSlippage = config.get('MAX_SLIPPAGE', 1.0);
        this.maxConcurrentTrades = config.get('MAX_CONCURRENT_TRADES', 3);
        this.privateKey = new Uint8Array(JSON.parse(config.get('WALLET_PRIVATE_KEY')));
        this.wallet = this._initializeWallet();
    }

    _initializeWallet() {
        try {
            return Keypair.fromSecretKey(this.privateKey);
        } catch (error) {
            logger.error('Failed to initialize wallet:', error.message);
            throw new Error('Invalid wallet configuration');
        }
    }

    /**
     * Execute a trade based on the given signal
     * @param {Object} signal Trading signal with token and direction
     * @returns {Promise<Object>} Trade result
     */
    async executeTrade(signal) {
        try {
            // Validate signal
            if (!this.validateSignal(signal)) {
                throw new Error('Invalid trading signal');
            }

            // Check risk parameters
            if (!this.riskManager.canTrade(signal)) {
                logger.warn('Trade rejected by risk manager');
                return { status: 'rejected', reason: 'Risk parameters not met' };
            }

            // Execute the swap
            const swapResult = await this.jupiterService.executeSwap({
                inputMint: signal.inputToken,
                outputMint: signal.outputToken,
                amount: signal.amount,
                slippage: signal.slippage || 1.0 // Default 1% slippage
            });

            logger.info('Trade executed successfully', {
                type: 'TRADE_EXECUTED',
                signal,
                result: swapResult
            });

            return {
                status: 'success',
                signature: swapResult.signature,
                details: swapResult.details
            };

        } catch (error) {
            logger.error('Trade execution failed:', error.message);
            throw error;
        }
    }

    /**
     * Validate trading signal
     * @param {Object} signal Trading signal
     * @returns {boolean} Validation result
     */
    validateSignal(signal) {
        return (
            signal &&
            signal.inputToken &&
            signal.outputToken &&
            signal.amount &&
            signal.amount > 0
        );
    }

    async executeTradeOld(token) {
        try {
            // Validate token safety
            const safetyScore = await smartFilter.evaluateToken(token.mint);
            if (safetyScore < 0.7) {
                logger.warn(`Token ${token.symbol} failed safety check with score ${safetyScore}`);
                return null;
            }

            // Get best route from Jupiter
            const route = await this.jupiterService.getBestRoute({
                inputMint: 'So11111111111111111111111111111111111111112', // SOL mint
                outputMint: token.mint,
                amount: this.tradeAmount * 1e9, // Convert to lamports
                slippage: this.maxSlippage
            });

            if (!route) {
                throw new Error('Failed to get route from Jupiter');
            }

            // Check if route meets our requirements
            if (route.priceImpact > this.maxSlippage) {
                logger.warn(`Slippage too high for ${token.symbol}: ${route.priceImpact}%`);
                return null;
            }

            // Execute the swap
            const swapResult = await this.jupiterService.executeSwap({
                inputMint: 'So11111111111111111111111111111111111111112',
                outputMint: token.mint,
                amount: this.tradeAmount * 1e9,
                slippage: this.maxSlippage,
                userPublicKey: this.wallet.publicKey.toBase58(),
                signTransaction: (tx) => this.wallet.signTransaction(tx)
            });

            if (!swapResult.success) {
                throw new Error('Failed to execute swap');
            }

            const result = new TradeResult({
                success: true,
                amount: this.tradeAmount,
                tokenAmount: swapResult.amountOut / 1e9, // Convert from lamports
                price: swapResult.price,
                txid: swapResult.txId,
                timestamp: Date.now()
            });

            logger.info(`Successfully traded ${token.symbol}: ${result.amount} SOL`);
            return result;

        } catch (error) {
            logger.error('Error in executeTrade:', error.message);
            return new TradeResult({ success: false, error: error.message });
        }
    }
}

module.exports = new TradeExecutor(); 