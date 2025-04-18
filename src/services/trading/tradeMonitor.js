const config = require('../../core/config');
const logger = require('../../core/utils/logger');
const marketAnalyzer = require('../market/marketAnalyzer');
const jupiterService = require('../dex/jupiterService');
const walletManager = require('../wallet/walletManager');

class TradeMonitor {
    constructor() {
        this.maxHoldTime = config.get('MAX_HOLD_TIME_MS', 300000); // 5 minutes
        this.trailingStopPercent = config.get('TRAILING_STOP_PERCENT', 0.01); // 1%
        this.minProfitPercent = config.get('MIN_PROFIT_PERCENT', 0.015); // 1.5%
        this.maxLossPercent = config.get('MAX_LOSS_PERCENT', 0.01); // 1%
        this.highestPrices = new Map();
        this.entryTimes = new Map();
    }

    /**
     * Monitors an active trade and determines if it should be closed
     * @param {Object} trade - Active trade information
     * @returns {Promise<Object>} Decision on whether to close the trade
     */
    async monitorTrade(trade) {
        try {
            const { tokenMint, tokenSymbol, entryPrice, solIn, entryTime } = trade;
            
            // Get current price
            const currentPrice = await marketAnalyzer.getTokenPrice(tokenMint);
            if (!currentPrice) {
                throw new Error('Failed to get current price');
            }

            // Update highest price
            if (!this.highestPrices.has(tokenMint) || currentPrice > this.highestPrices.get(tokenMint)) {
                this.highestPrices.set(tokenMint, currentPrice);
            }

            // Calculate profit/loss
            const pnl = (currentPrice - entryPrice) / entryPrice;
            const highestPrice = this.highestPrices.get(tokenMint);
            const dropFromHigh = (highestPrice - currentPrice) / highestPrice;

            // Check break-even including gas costs
            const gasCost = await this._estimateGasCost(tokenMint);
            const breakEvenPrice = entryPrice * (1 + gasCost / solIn);

            // Decision making
            const decision = {
                shouldClose: false,
                reason: '',
                currentPrice,
                pnl
            };

            // Check time-based exit
            if (Date.now() - entryTime > this.maxHoldTime) {
                decision.shouldClose = true;
                decision.reason = 'Maximum hold time reached';
                return decision;
            }

            // Check trailing stop
            if (pnl > 0 && dropFromHigh >= this.trailingStopPercent) {
                decision.shouldClose = true;
                decision.reason = 'Trailing stop triggered';
                return decision;
            }

            // Check profit target
            if (pnl >= this.minProfitPercent) {
                decision.shouldClose = true;
                decision.reason = 'Profit target reached';
                return decision;
            }

            // Check loss limit
            if (pnl <= -this.maxLossPercent) {
                decision.shouldClose = true;
                decision.reason = 'Loss limit reached';
                return decision;
            }

            // Check break-even
            if (currentPrice >= breakEvenPrice) {
                decision.shouldClose = true;
                decision.reason = 'Break-even point reached';
                return decision;
            }

            return decision;

        } catch (error) {
            logger.error('Trade monitoring failed:', error.message);
            throw error;
        }
    }

    /**
     * Estimates gas cost for a trade
     * @private
     */
    async _estimateGasCost(tokenMint) {
        try {
            // Get current gas price
            const gasPrice = await walletManager.getGasPrice();
            
            // Estimate transaction size
            const txSize = await jupiterService.estimateTransactionSize({
                tokenMint,
                amount: 1 // Use 1 SOL as reference
            });

            // Calculate gas cost
            return gasPrice * txSize;
        } catch (error) {
            logger.error('Failed to estimate gas cost:', error.message);
            return 0.001; // Default to 0.001 SOL if estimation fails
        }
    }

    /**
     * Cleans up monitoring data for a closed trade
     */
    cleanupTrade(tokenMint) {
        this.highestPrices.delete(tokenMint);
        this.entryTimes.delete(tokenMint);
    }
}

module.exports = new TradeMonitor(); 