const config = require('../../core/config');
const logger = require('../../core/utils/logger');
const tradeRepository = require('../../data/repositories/tradeRepository');
const alertSystem = require('../../features/notification/alertSystem');
const tokenMonitor = require('../../features/monitoring/tokenMonitor');
const strategyManager = require('../../features/strategy/strategyManager');
const smartFilter = require('../../features/filtering/smartFilter');
const jupiterService = require('../dex/jupiterService');
const walletManager = require('../wallet/walletManager');
const riskManager = require('../risk/riskManager');
const marketAnalyzer = require('../market/marketAnalyzer');
const tradeMonitor = require('./tradeMonitor');

class TradeExecutor {
    constructor() {
        this.activeTrades = new Map();
        this.maxConcurrentTrades = config.get('MAX_CONCURRENT_TRADES', 3);
        this.minLiquidity = config.get('MIN_LIQUIDITY', 100); // SOL
        this.maxSlippage = config.get('MAX_SLIPPAGE', 0.05); // 5%
        this.maxHoldTime = config.get('MAX_HOLD_TIME_MS', 300000); // 5 minutes
        this.lastTradeTime = new Map();
        this.monitoringInterval = setInterval(() => this._monitorTrades(), 10000); // Check every 10 seconds
        this.executionLock = new Map(); // Prevent duplicate executions
    }

    /**
     * Executes a buy order for a token
     * @param {Object} params - Trade parameters
     * @param {string} params.tokenMint - Token mint address
     * @param {string} params.tokenSymbol - Token symbol
     * @param {string} params.strategy - Strategy to use
     * @param {number} params.amount - Amount of SOL to invest
     * @param {string} params.entryReason - Reason for entry
     * @returns {Promise<Object>} Trade execution result
     */
    async executeBuy(params) {
        const { tokenMint, tokenSymbol, amount, strategy, entryReason } = params;
        
        // Validate input parameters
        if (!this._validateInputParams(params)) {
            throw new Error('Invalid trade parameters');
        }

        // Check execution lock
        if (this.executionLock.has(tokenMint)) {
            throw new Error('Trade execution already in progress for this token');
        }

        try {
            this.executionLock.set(tokenMint, true);

            // Check if we're already trading this token
            if (this.activeTrades.has(tokenMint)) {
                throw new Error('Already have an active trade for this token');
            }

            // Check if we've reached max concurrent trades
            if (this.activeTrades.size >= this.maxConcurrentTrades) {
                throw new Error('Maximum concurrent trades reached');
            }

            // Get market metrics with retry
            const metrics = await this._getMarketMetricsWithRetry(tokenMint);
            if (!metrics || metrics.liquidity < this.minLiquidity) {
                throw new Error('Insufficient liquidity for trading');
            }

            // Validate risk parameters
            const riskValidation = await riskManager.validateTrade({
                tokenMint,
                amount,
                strategy,
                metrics
            });

            if (!riskValidation.isValid) {
                throw new Error(`Trade validation failed: ${riskValidation.reasons.join(', ')}`);
            }

            // Get detailed market analysis
            const marketAnalysis = await marketAnalyzer.getMarketCondition(tokenMint);
            const technicalIndicators = await marketAnalyzer.getTechnicalIndicators(tokenMint);

            // Enhanced entry conditions
            if (!this._validateEntryConditions(marketAnalysis, technicalIndicators)) {
                throw new Error('Market conditions not favorable for entry');
            }

            // Calculate dynamic position size
            const positionSize = await this._calculatePositionSize({
                tokenMint,
                amount,
                marketAnalysis,
                technicalIndicators,
                metrics
            });

            // Verify wallet balance before execution
            const walletBalance = await walletManager.getBalance();
            if (walletBalance < positionSize) {
                throw new Error('Insufficient wallet balance for trade');
            }

            // Execute buy order with improved slippage handling
            const buyResult = await this._executeOrderWithRetry({
                tokenMint,
                tokenSymbol,
                amount: positionSize,
                type: 'buy',
                slippage: this._calculateDynamicSlippage(marketAnalysis, technicalIndicators)
            });

            // Verify execution result
            if (!buyResult || !buyResult.price || !buyResult.txId) {
                throw new Error('Trade execution failed - invalid result');
            }

            // Record trade with enhanced metrics
            const tradeInfo = {
                tokenMint,
                tokenSymbol,
                strategy,
                entryPrice: buyResult.price,
                solIn: positionSize,
                buyTx: buyResult.txId,
                liquidity: metrics.liquidity,
                volume24h: metrics.volume24h,
                entryReason,
                marketCondition: marketAnalysis.condition,
                confidence: marketAnalysis.confidence,
                technicalIndicators
            };

            // Store active trade
            this.activeTrades.set(tokenMint, {
                ...tradeInfo,
                entryTime: new Date(),
                status: 'active',
                stopLoss: this._calculateStopLoss(buyResult.price, marketAnalysis, technicalIndicators),
                takeProfit: this._calculateTakeProfit(buyResult.price, marketAnalysis, technicalIndicators)
            });

            // Update position in risk manager
            await riskManager.updatePosition({
                tokenMint,
                entryPrice: buyResult.price,
                amount: positionSize,
                marketCondition: marketAnalysis.condition,
                confidence: marketAnalysis.confidence
            });

            // Send trade alert
            await alertSystem.sendTradeAlert({
                tokenSymbol,
                action: 'buy',
                amount: positionSize,
                txId: buyResult.txId,
                price: buyResult.price
            });

            return tradeInfo;
        } catch (error) {
            logger.error('Buy execution failed:', error.message);
            await alertSystem.sendErrorAlert(error, 'Buy Execution');
            throw error;
        } finally {
            this.executionLock.delete(tokenMint);
        }
    }

    /**
     * Executes a sell order for a token
     * @param {Object} params - Trade parameters
     * @param {string} params.tokenMint - Token mint address
     * @param {string} params.tokenSymbol - Token symbol
     * @param {string} params.exitReason - Reason for exit
     * @returns {Promise<Object>} Trade execution result
     */
    async executeSell(params) {
        try {
            const { tokenMint, tokenSymbol, exitReason } = params;

            // Get active trade
            const activeTrade = this.activeTrades.get(tokenMint);
            if (!activeTrade) {
                throw new Error('No active trade found for token');
            }

            // Get current metrics
            const metrics = await tokenMonitor.getTokenMetrics(tokenMint);
            if (!metrics) {
                throw new Error('Failed to get token metrics');
            }

            // Get current market condition
            const marketCondition = await marketAnalyzer.getMarketCondition(tokenMint);

            // Execute sell order
            const sellResult = await this._executeOrder({
                tokenMint,
                tokenSymbol,
                amount: activeTrade.solIn,
                type: 'sell',
                slippage: this.maxSlippage
            });

            // Calculate PnL
            const pnl = sellResult.amount - activeTrade.solIn;
            const pnlPercent = (pnl / activeTrade.solIn) * 100;

            // Record complete trade
            const completeTrade = {
                ...activeTrade,
                exitPrice: sellResult.price,
                solOut: sellResult.amount,
                pnl,
                pnlPercent,
                sellTx: sellResult.txId,
                exitReason,
                exitTime: new Date()
            };

            // Save to repository
            await tradeRepository.saveTrade(completeTrade);

            // Update risk manager
            await riskManager.closePosition({
                tokenMint,
                exitPrice: sellResult.price,
                pnl
            });

            // Remove from active trades
            this.activeTrades.delete(tokenMint);

            // Send alert
            await alertSystem.sendTradeAlert({
                tokenSymbol,
                action: 'sell',
                amount: sellResult.amount,
                txId: sellResult.txId,
                price: sellResult.price,
                pnl,
                pnlPercent
            });

            return {
                success: true,
                tradeInfo: completeTrade
            };

        } catch (error) {
            logger.error('Sell execution failed:', error.message);
            await alertSystem.sendErrorAlert(error, 'Sell Execution');
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Executes an order (buy or sell) using Jupiter DEX
     * @private
     */
    async _executeOrder({ tokenMint, tokenSymbol, amount, type, slippage }) {
        try {
            const userPublicKey = walletManager.getPublicKey();
            const signTransaction = walletManager.signTransaction.bind(walletManager);

            // Convert SOL to lamports
            const amountLamports = Math.floor(amount * 1e9);

            // Execute swap
            const swapResult = await jupiterService.executeSwap({
                inputMint: type === 'buy' ? 'So11111111111111111111111111111111111111112' : tokenMint,
                outputMint: type === 'buy' ? tokenMint : 'So11111111111111111111111111111111111111112',
                amount: amountLamports,
                slippage: slippage * 100, // Convert to basis points
                userPublicKey,
                signTransaction
            });

            if (!swapResult.success) {
                throw new Error('Swap execution failed');
            }

            // Convert back to SOL
            const amountOut = swapResult.amountOut / 1e9;
            const price = type === 'buy' ? amount / amountOut : amountOut / amount;

            return {
                price,
                amount: amountOut,
                txId: swapResult.txId
            };

        } catch (error) {
            logger.error('Order execution failed:', error.message);
            throw error;
        }
    }

    /**
     * Checks if a token is in cooldown period
     * @private
     */
    _isInCooldown(tokenMint) {
        const lastTrade = this.lastTradeTime.get(tokenMint);
        if (!lastTrade) return false;
        return Date.now() - lastTrade < this.maxHoldTime;
    }

    /**
     * Gets active trades
     * @returns {Array} List of active trades
     */
    getActiveTrades() {
        return Array.from(this.activeTrades.values());
    }

    /**
     * Checks if a token has an active trade
     * @param {string} tokenMint - Token mint address
     * @returns {boolean} True if token has active trade
     */
    hasActiveTrade(tokenMint) {
        return this.activeTrades.has(tokenMint);
    }

    /**
     * Monitors all active trades
     * @private
     */
    async _monitorTrades() {
        for (const [tokenMint, trade] of this.activeTrades) {
            try {
                const decision = await tradeMonitor.monitorTrade(trade);
                
                if (decision.shouldClose) {
                    logger.info(`Closing trade for ${trade.tokenSymbol}: ${decision.reason}`);
                    
                    await this.executeSell({
                        tokenMint,
                        tokenSymbol: trade.tokenSymbol,
                        exitReason: decision.reason
                    });

                    tradeMonitor.cleanupTrade(tokenMint);
                }
            } catch (error) {
                logger.error(`Failed to monitor trade for ${trade.tokenSymbol}:`, error.message);
            }
        }
    }

    _validateEntryConditions(marketAnalysis, technicalIndicators) {
        // Entry conditions based on market analysis and technical indicators
        const { condition, confidence } = marketAnalysis;
        const { rsi, macd, trend } = technicalIndicators;

        // Basic market condition check
        if (condition === 'bearish' && confidence > 0.7) return false;

        // RSI check
        if (rsi > 70) return false; // Overbought
        if (rsi < 30) return true; // Oversold

        // MACD check
        if (macd.histogram < 0) return false; // Bearish momentum

        // Trend alignment
        if (trend.shortTerm !== trend.mediumTerm) return false;

        return true;
    }

    _calculatePositionSize({ tokenMint, amount, marketAnalysis, technicalIndicators, metrics }) {
        // Base position size on market conditions and confidence
        const { confidence } = marketAnalysis;
        const { rsi, macd } = technicalIndicators;

        // Adjust position size based on confidence
        let sizeMultiplier = confidence;

        // Adjust based on RSI
        if (rsi < 30) sizeMultiplier *= 1.2; // Oversold
        else if (rsi > 70) sizeMultiplier *= 0.8; // Overbought

        // Adjust based on MACD
        if (macd.histogram > 0) sizeMultiplier *= 1.1; // Bullish momentum
        else sizeMultiplier *= 0.9; // Bearish momentum

        // Ensure position size doesn't exceed max allowed
        const maxPosition = riskManager.getMaxPositionSize(tokenMint);
        return Math.min(amount * sizeMultiplier, maxPosition);
    }

    _calculateDynamicSlippage(marketAnalysis, technicalIndicators) {
        // Base slippage on market conditions
        const { condition, confidence } = marketAnalysis;
        const { volumeTrend } = technicalIndicators;

        let slippage = this.maxSlippage;

        // Adjust based on market condition
        if (condition === 'bullish' && confidence > 0.7) {
            slippage *= 1.2; // Allow more slippage in strong trends
        } else if (condition === 'bearish') {
            slippage *= 0.8; // Be more conservative in bearish markets
        }

        // Adjust based on volume
        if (volumeTrend === 'increasing') {
            slippage *= 1.1; // More slippage with increasing volume
        } else if (volumeTrend === 'decreasing') {
            slippage *= 0.9; // Less slippage with decreasing volume
        }

        return Math.min(slippage, this.maxSlippage);
    }

    _calculateStopLoss(entryPrice, marketAnalysis, technicalIndicators) {
        // Calculate dynamic stop loss based on market conditions
        const { condition, confidence } = marketAnalysis;
        const { volatility } = technicalIndicators;

        // Base stop loss percentage
        let stopLossPercent = 0.01; // 1%

        // Adjust based on market condition
        if (condition === 'bullish' && confidence > 0.7) {
            stopLossPercent *= 1.2; // Wider stop in strong trends
        } else if (condition === 'bearish') {
            stopLossPercent *= 0.8; // Tighter stop in bearish markets
        }

        // Adjust based on volatility
        stopLossPercent *= (1 + volatility);

        return entryPrice * (1 - stopLossPercent);
    }

    _calculateTakeProfit(entryPrice, marketAnalysis, technicalIndicators) {
        // Calculate dynamic take profit based on market conditions
        const { condition, confidence } = marketAnalysis;
        const { volatility } = technicalIndicators;

        // Base take profit percentage
        let takeProfitPercent = 0.02; // 2%

        // Adjust based on market condition
        if (condition === 'bullish' && confidence > 0.7) {
            takeProfitPercent *= 1.3; // Higher target in strong trends
        } else if (condition === 'bearish') {
            takeProfitPercent *= 0.7; // Lower target in bearish markets
        }

        // Adjust based on volatility
        takeProfitPercent *= (1 + volatility);

        return entryPrice * (1 + takeProfitPercent);
    }

    _validateInputParams(params) {
        const { tokenMint, tokenSymbol, amount, strategy, entryReason } = params;
        
        if (!tokenMint || typeof tokenMint !== 'string') {
            logger.error('Invalid token mint:', tokenMint);
            return false;
        }
        
        if (!tokenSymbol || typeof tokenSymbol !== 'string') {
            logger.error('Invalid token symbol:', tokenSymbol);
            return false;
        }
        
        if (!amount || typeof amount !== 'number' || amount <= 0) {
            logger.error('Invalid amount:', amount);
            return false;
        }
        
        if (!strategy || typeof strategy !== 'string') {
            logger.error('Invalid strategy:', strategy);
            return false;
        }
        
        if (!entryReason || typeof entryReason !== 'string') {
            logger.error('Invalid entry reason:', entryReason);
            return false;
        }
        
        return true;
    }

    async _getMarketMetricsWithRetry(tokenMint, maxRetries = 3) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const metrics = await marketAnalyzer.getTokenMetrics(tokenMint);
                if (metrics) return metrics;
            } catch (error) {
                lastError = error;
                logger.warn(`Attempt ${i + 1} failed to get market metrics:`, error.message);
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            }
        }
        throw lastError || new Error('Failed to get market metrics after retries');
    }

    async _executeOrderWithRetry(params, maxRetries = 3) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const result = await this._executeOrder(params);
                if (result) return result;
            } catch (error) {
                lastError = error;
                logger.warn(`Attempt ${i + 1} failed to execute order:`, error.message);
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // Exponential backoff
            }
        }
        throw lastError || new Error('Failed to execute order after retries');
    }
}

module.exports = new TradeExecutor(); 