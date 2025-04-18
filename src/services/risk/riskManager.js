const config = require('../../core/config');
const logger = require('../../core/utils/logger');
const marketAnalyzer = require('../market/marketAnalyzer');
const walletManager = require('../wallet/walletManager');

class RiskManager {
    constructor() {
        this.maxPositionSize = config.get('MAX_POSITION_SIZE', 0.1); // 10% of portfolio
        this.maxDailyLoss = config.get('MAX_DAILY_LOSS', 0.05); // 5% of portfolio
        this.maxLossPercent = config.get('MAX_LOSS_PERCENT', 0.01); // 1%
        this.minProfitPercent = config.get('MIN_PROFIT_PERCENT', 0.015); // 1.5%
        this.maxOpenTrades = config.get('MAX_CONCURRENT_TRADES', 3);
        this.dailyPnL = 0;
        this.positions = new Map();
    }

    /**
     * Calculates position size based on risk parameters
     * @param {Object} params - Position parameters
     * @param {string} params.tokenMint - Token mint address
     * @param {number} params.entryPrice - Entry price
     * @returns {Promise<number>} Position size in SOL
     */
    async calculatePositionSize(params) {
        try {
            const { tokenMint, entryPrice } = params;
            const walletBalance = walletManager.getBalance();
            const maxPositionValue = walletBalance * this.maxPositionSize;

            // Get price impact
            const priceImpact = await marketAnalyzer.getPriceImpact(tokenMint, maxPositionValue);
            if (priceImpact > 0.02) { // 2% max price impact
                return maxPositionValue * (0.02 / priceImpact);
            }

            return maxPositionValue;
        } catch (error) {
            logger.error('Failed to calculate position size:', error.message);
            return 0;
        }
    }

    /**
     * Checks if a trade is within risk limits
     * @param {Object} params - Trade parameters
     * @param {string} params.tokenMint - Token mint address
     * @param {number} params.amount - Amount in SOL
     * @returns {Promise<boolean>} True if trade is within limits
     */
    async validateTrade(params) {
        try {
            const { tokenMint, amount } = params;

            // Check wallet balance
            if (!walletManager.hasSufficientBalance(amount)) {
                logger.warning('Insufficient balance for trade');
                return false;
            }

            // Check position size
            const maxPosition = await this.calculatePositionSize({
                tokenMint,
                entryPrice: 1 // Placeholder, actual price will be set at execution
            });
            if (amount > maxPosition) {
                logger.warning('Position size exceeds maximum');
                return false;
            }

            // Check daily loss limit
            if (this.dailyPnL < -this.maxDailyLoss * walletManager.getBalance()) {
                logger.warning('Daily loss limit reached');
                return false;
            }

            // Check open trades
            if (this.positions.size >= this.maxOpenTrades) {
                logger.warning('Maximum open trades reached');
                return false;
            }

            return true;
        } catch (error) {
            logger.error('Failed to validate trade:', error.message);
            return false;
        }
    }

    /**
     * Updates position information
     * @param {Object} params - Position parameters
     * @param {string} params.tokenMint - Token mint address
     * @param {number} params.entryPrice - Entry price
     * @param {number} params.amount - Amount in SOL
     */
    updatePosition(params) {
        const { tokenMint, entryPrice, amount } = params;
        this.positions.set(tokenMint, {
            entryPrice,
            amount,
            entryTime: new Date(),
            status: 'active'
        });
    }

    /**
     * Closes a position and updates PnL
     * @param {Object} params - Position parameters
     * @param {string} params.tokenMint - Token mint address
     * @param {number} params.exitPrice - Exit price
     */
    closePosition(params) {
        const { tokenMint, exitPrice } = params;
        const position = this.positions.get(tokenMint);
        if (!position) return;

        const pnl = (exitPrice - position.entryPrice) * position.amount;
        this.dailyPnL += pnl;
        this.positions.delete(tokenMint);
    }

    /**
     * Checks if stop loss is triggered
     * @param {Object} params - Position parameters
     * @param {string} params.tokenMint - Token mint address
     * @param {number} params.currentPrice - Current price
     * @returns {boolean} True if stop loss is triggered
     */
    isStopLossTriggered(params) {
        const { tokenMint, currentPrice } = params;
        const position = this.positions.get(tokenMint);
        if (!position) return false;

        const loss = (position.entryPrice - currentPrice) / position.entryPrice;
        return loss >= this.maxLossPercent;
    }

    /**
     * Checks if take profit is triggered
     * @param {Object} params - Position parameters
     * @param {string} params.tokenMint - Token mint address
     * @param {number} params.currentPrice - Current price
     * @returns {boolean} True if take profit is triggered
     */
    isTakeProfitTriggered(params) {
        const { tokenMint, currentPrice } = params;
        const position = this.positions.get(tokenMint);
        if (!position) return false;

        const profit = (currentPrice - position.entryPrice) / position.entryPrice;
        return profit >= this.minProfitPercent;
    }

    /**
     * Gets current positions
     * @returns {Array} List of current positions
     */
    getPositions() {
        return Array.from(this.positions.entries()).map(([tokenMint, position]) => ({
            tokenMint,
            ...position
        }));
    }

    /**
     * Gets daily PnL
     * @returns {number} Daily PnL in SOL
     */
    getDailyPnL() {
        return this.dailyPnL;
    }

    /**
     * Resets daily PnL (call at start of new day)
     */
    resetDailyPnL() {
        this.dailyPnL = 0;
    }
}

module.exports = new RiskManager(); 