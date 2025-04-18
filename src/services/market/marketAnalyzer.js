const axios = require('axios');
const config = require('../../core/config');
const logger = require('../../core/utils/logger');
const jupiterService = require('../dex/jupiterService');

class MarketAnalyzer {
    constructor() {
        this.priceHistory = new Map();
        this.volumeHistory = new Map();
        this.liquidityHistory = new Map();
        this.updateInterval = config.get('MARKET_UPDATE_INTERVAL', 60000); // 1 minute
        this.startMarketTracking();
    }

    /**
     * Starts market tracking
     * @private
     */
    startMarketTracking() {
        setInterval(() => this.updateMarketData(), this.updateInterval);
    }

    /**
     * Updates market data for all tracked tokens
     * @private
     */
    async updateMarketData() {
        try {
            // Get all active tokens from price history
            const tokens = Array.from(this.priceHistory.keys());
            
            for (const token of tokens) {
                await this.updateTokenData(token);
            }
        } catch (error) {
            logger.error('Failed to update market data:', error.message);
        }
    }

    /**
     * Updates data for a specific token
     * @param {string} tokenMint - Token mint address
     */
    async updateTokenData(tokenMint) {
        try {
            const [price, metadata] = await Promise.all([
                jupiterService.getTokenPrice(tokenMint),
                jupiterService.getTokenMetadata(tokenMint)
            ]);

            const timestamp = Date.now();

            // Update price history
            if (!this.priceHistory.has(tokenMint)) {
                this.priceHistory.set(tokenMint, []);
            }
            this.priceHistory.get(tokenMint).push({ timestamp, price });

            // Update volume history
            if (!this.volumeHistory.has(tokenMint)) {
                this.volumeHistory.set(tokenMint, []);
            }
            this.volumeHistory.get(tokenMint).push({
                timestamp,
                volume: metadata.volume24h
            });

            // Update liquidity history
            if (!this.liquidityHistory.has(tokenMint)) {
                this.liquidityHistory.set(tokenMint, []);
            }
            this.liquidityHistory.get(tokenMint).push({
                timestamp,
                liquidity: metadata.liquidity
            });

            // Keep only last 24 hours of data
            this._trimHistory(tokenMint);

        } catch (error) {
            logger.error(`Failed to update token data for ${tokenMint}:`, error.message);
        }
    }

    /**
     * Trims history to last 24 hours
     * @param {string} tokenMint - Token mint address
     * @private
     */
    _trimHistory(tokenMint) {
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        
        const trimArray = (array) => {
            return array.filter(item => item.timestamp >= oneDayAgo);
        };

        this.priceHistory.set(tokenMint, trimArray(this.priceHistory.get(tokenMint)));
        this.volumeHistory.set(tokenMint, trimArray(this.volumeHistory.get(tokenMint)));
        this.liquidityHistory.set(tokenMint, trimArray(this.liquidityHistory.get(tokenMint)));
    }

    /**
     * Gets current market condition for a token with confidence score
     * @param {string} tokenMint - Token mint address
     * @returns {Promise<Object>} Market condition with confidence
     */
    async getMarketCondition(tokenMint) {
        try {
            const priceHistory = this.priceHistory.get(tokenMint) || [];
            const volumeHistory = this.volumeHistory.get(tokenMint) || [];
            
            if (priceHistory.length < 2 || volumeHistory.length < 2) {
                return { condition: 'neutral', confidence: 0.5 };
            }

            const recentPrices = priceHistory.slice(-20); // Use more data points
            const recentVolumes = volumeHistory.slice(-20);

            // Calculate technical indicators
            const rsi = this.calculateRSI(recentPrices);
            const macd = this.calculateMACD(recentPrices);
            const volumeMA = this.calculateVolumeMA(recentVolumes);
            const priceMA = this.calculatePriceMA(recentPrices);

            // Analyze trends
            const shortTermTrend = this.analyzeTrend(recentPrices.slice(-5));
            const mediumTermTrend = this.analyzeTrend(recentPrices.slice(-10));
            const longTermTrend = this.analyzeTrend(recentPrices);

            // Calculate confidence score
            let confidence = 0;
            let bullishSignals = 0;
            let bearishSignals = 0;

            // RSI analysis
            if (rsi > 70) bearishSignals++;
            else if (rsi < 30) bullishSignals++;

            // MACD analysis
            if (macd.histogram > 0) bullishSignals++;
            else bearishSignals++;

            // Volume analysis
            const volumeTrend = this.analyzeVolumeTrend(recentVolumes);
            if (volumeTrend === 'increasing' && shortTermTrend === 'up') bullishSignals++;
            else if (volumeTrend === 'decreasing' && shortTermTrend === 'down') bearishSignals++;

            // Trend alignment
            if (shortTermTrend === mediumTermTrend && mediumTermTrend === longTermTrend) {
                if (shortTermTrend === 'up') bullishSignals += 2;
                else if (shortTermTrend === 'down') bearishSignals += 2;
            }

            // Calculate final condition and confidence
            const totalSignals = bullishSignals + bearishSignals;
            confidence = totalSignals > 0 ? Math.max(bullishSignals, bearishSignals) / totalSignals : 0.5;

            if (bullishSignals > bearishSignals) {
                return { condition: 'bullish', confidence };
            } else if (bearishSignals > bullishSignals) {
                return { condition: 'bearish', confidence };
            } else {
                return { condition: 'neutral', confidence };
            }
        } catch (error) {
            logger.error('Failed to get market condition:', error.message);
            return { condition: 'neutral', confidence: 0.5 };
        }
    }

    /**
     * Calculates RSI (Relative Strength Index)
     * @param {Array} prices - Array of price objects with timestamp and price
     * @returns {number} RSI value
     */
    calculateRSI(prices, period = 14) {
        if (prices.length < period + 1) return 50;

        const changes = [];
        for (let i = 1; i < prices.length; i++) {
            changes.push(prices[i].price - prices[i-1].price);
        }

        let gains = 0;
        let losses = 0;

        for (let i = 0; i < period; i++) {
            if (changes[i] > 0) gains += changes[i];
            else losses -= changes[i];
        }

        let avgGain = gains / period;
        let avgLoss = losses / period;

        for (let i = period; i < changes.length; i++) {
            if (changes[i] > 0) {
                avgGain = (avgGain * (period - 1) + changes[i]) / period;
                avgLoss = (avgLoss * (period - 1)) / period;
            } else {
                avgGain = (avgGain * (period - 1)) / period;
                avgLoss = (avgLoss * (period - 1) - changes[i]) / period;
            }
        }

        const rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }

    /**
     * Calculates MACD (Moving Average Convergence Divergence)
     * @param {Array} prices - Array of price objects
     * @returns {Object} MACD values
     */
    calculateMACD(prices) {
        const ema12 = this.calculateEMA(prices, 12);
        const ema26 = this.calculateEMA(prices, 26);
        const macdLine = ema12 - ema26;
        const signalLine = this.calculateEMA(prices.map((p, i) => ({ price: macdLine })), 9);
        const histogram = macdLine - signalLine;

        return { macdLine, signalLine, histogram };
    }

    /**
     * Calculates Exponential Moving Average
     * @param {Array} prices - Array of price objects
     * @param {number} period - EMA period
     * @returns {number} EMA value
     */
    calculateEMA(prices, period) {
        if (prices.length < period) return prices[prices.length - 1].price;

        const multiplier = 2 / (period + 1);
        let ema = prices[0].price;

        for (let i = 1; i < prices.length; i++) {
            ema = (prices[i].price - ema) * multiplier + ema;
        }

        return ema;
    }

    /**
     * Analyzes price trend
     * @param {Array} prices - Array of price objects
     * @returns {string} Trend direction
     */
    analyzeTrend(prices) {
        if (prices.length < 2) return 'neutral';

        const firstPrice = prices[0].price;
        const lastPrice = prices[prices.length - 1].price;
        const change = (lastPrice - firstPrice) / firstPrice;

        if (change > 0.02) return 'up';
        if (change < -0.02) return 'down';
        return 'neutral';
    }

    /**
     * Gets price impact for a trade
     * @param {string} tokenMint - Token mint address
     * @param {number} amount - Amount in SOL
     * @returns {Promise<number>} Price impact percentage
     */
    async getPriceImpact(tokenMint, amount) {
        try {
            const liquidity = await this.getCurrentLiquidity(tokenMint);
            if (!liquidity) return 0;

            // Simple price impact calculation
            return (amount / liquidity) * 100;
        } catch (error) {
            logger.error('Failed to calculate price impact:', error.message);
            return 0;
        }
    }

    /**
     * Gets current liquidity for a token
     * @param {string} tokenMint - Token mint address
     * @returns {Promise<number>} Liquidity in SOL
     */
    async getCurrentLiquidity(tokenMint) {
        try {
            const metadata = await jupiterService.getTokenMetadata(tokenMint);
            return metadata.liquidity || 0;
        } catch (error) {
            logger.error('Failed to get current liquidity:', error.message);
            return 0;
        }
    }

    /**
     * Gets volume trend for a token
     * @param {string} tokenMint - Token mint address
     * @returns {Promise<string>} Volume trend
     */
    async getVolumeTrend(tokenMint) {
        try {
            const volumeHistory = this.volumeHistory.get(tokenMint) || [];
            if (volumeHistory.length < 2) return 'stable';

            const recentVolumes = volumeHistory.slice(-10);
            const volumeChange = (recentVolumes[recentVolumes.length - 1].volume - recentVolumes[0].volume) / recentVolumes[0].volume;

            if (volumeChange > 0.1) return 'increasing';
            if (volumeChange < -0.1) return 'decreasing';
            return 'stable';
        } catch (error) {
            logger.error('Failed to get volume trend:', error.message);
            return 'stable';
        }
    }
}

module.exports = new MarketAnalyzer(); 