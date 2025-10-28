const config = require('../../core/config');
const logger = require('../../core/utils/logger');
const walletManager = require('../wallet/walletManager');

class RiskManager {
    constructor() {
        this.maxPositionSize = config.get('MAX_POSITION_SIZE', 1.0); // 1 SOL
        this.maxRiskPerTrade = config.get('MAX_RISK_PER_TRADE', 0.1); // 10%
        this.maxDailyLoss = config.get('MAX_DAILY_LOSS', 0.2); // 20%
        this.activeTrades = new Map();
        this.dailyStats = {
            totalTrades: 0,
            winningTrades: 0,
            totalPnL: 0,
            lastReset: Date.now()
        };
    }

    async validateTrade({ tokenMint, amount, strategy, metrics }) {
        try {
            const reasons = [];

            // Check if we have enough balance
            const hasBalance = await walletManager.hasSufficientBalance(amount);
            if (!hasBalance) {
                reasons.push('Insufficient wallet balance');
            }

            // Check if amount exceeds max position size
            if (amount > this.maxPositionSize) {
                reasons.push(`Trade amount exceeds max position size of ${this.maxPositionSize} SOL`);
            }

            // Check if we're already trading this token
            if (this.activeTrades.has(tokenMint)) {
                reasons.push('Already have an active trade for this token');
            }

            // Check daily loss limit
            if (this.dailyStats.totalPnL < -this.maxDailyLoss) {
                reasons.push(`Daily loss limit of ${this.maxDailyLoss * 100}% reached`);
            }

            // Check price impact
            if (metrics.priceImpact > 2.0) {
                reasons.push(`Price impact too high: ${metrics.priceImpact}%`);
            }

            return {
                isValid: reasons.length === 0,
                reasons
            };
        } catch (error) {
            logger.error('Failed to validate trade:', error.message);
            return {
                isValid: false,
                reasons: ['Trade validation failed']
            };
        }
    }

    updatePosition({ tokenMint, entryPrice, amount }) {
        this.activeTrades.set(tokenMint, {
            entryPrice,
            amount,
            timestamp: Date.now()
        });
    }

    closePosition({ tokenMint, exitPrice, pnl }) {
        this.activeTrades.delete(tokenMint);
        this.updateDailyStats(pnl > 0);
        this.dailyStats.totalPnL += pnl;
    }

    updateDailyStats(isWin) {
        // Reset daily stats if it's a new day
        const now = Date.now();
        if (now - this.dailyStats.lastReset > 24 * 60 * 60 * 1000) {
            this.dailyStats = {
                totalTrades: 0,
                winningTrades: 0,
                totalPnL: 0,
                lastReset: now
            };
        }

        this.dailyStats.totalTrades++;
        if (isWin) {
            this.dailyStats.winningTrades++;
        }
    }

    getMaxPositionSize(tokenMint) {
        return this.maxPositionSize;
    }
}

module.exports = new RiskManager(); 