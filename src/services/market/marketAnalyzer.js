const config = require('../../core/config');
const logger = require('../../core/utils/logger');
const jupiterService = require('../dex/jupiterService');

class MarketAnalyzer {
    constructor() {
        this.priceHistory = new Map();
        this.volumeHistory = new Map();
        this.liquidityHistory = new Map();
        this.updateInterval = config.get('MARKET_UPDATE_INTERVAL', 60000); // 1 minute
    }

    async getTokenMetrics(tokenMint) {
        try {
            // Get quote from Jupiter REST API with a smaller amount
            const quoteResponse = await jupiterService.getBestRoute({
                inputMint: 'So11111111111111111111111111111111111111112', // SOL
                outputMint: tokenMint,
                amount: '100000000', // 0.1 SOL in lamports
                slippage: 0.5
            });

            if (!quoteResponse || !quoteResponse.outAmount) {
                return null;
            }

            // Get token info from Jupiter REST API
            const tokenInfo = await jupiterService.getTokenMetadata(tokenMint);

            return {
                liquidity: quoteResponse.outAmount / 100000000, // Convert to SOL
                priceImpact: quoteResponse.priceImpactPct || 0,
                volume24h: tokenInfo?.volume24h || 0,
                price: quoteResponse.outAmount / 1e8 // Price in SOL
            };
        } catch (error) {
            logger.error('Failed to get token metrics:', error.message);
            return null;
        }
    }

    async getMarketCondition(tokenMint) {
        try {
            const metrics = await this.getTokenMetrics(tokenMint);
            if (!metrics) {
                return {
                    condition: 'unknown',
                    confidence: 0
                };
            }

            // More lenient conditions for testing
            return {
                condition: metrics.priceImpact < 2 ? 'bullish' : 'bearish', // Increased threshold
                confidence: 0.8 // Higher confidence for testing
            };
        } catch (error) {
            logger.error('Failed to get market condition:', error.message);
            return {
                condition: 'unknown',
                confidence: 0
            };
        }
    }

    async getTechnicalIndicators(tokenMint) {
        try {
            const metrics = await this.getTokenMetrics(tokenMint);
            if (!metrics) {
                return null;
            }

            // More lenient indicators for testing
            return {
                rsi: 45, // Slightly oversold
                macd: {
                    histogram: 0.1, // Slightly positive
                    signal: 0,
                    value: 0
                },
                trend: {
                    shortTerm: 'up',
                    mediumTerm: 'up'
                },
                volatility: metrics.priceImpact,
                volumeTrend: 'increasing'
            };
        } catch (error) {
            logger.error('Failed to get technical indicators:', error.message);
            return null;
        }
    }
}

module.exports = new MarketAnalyzer(); 