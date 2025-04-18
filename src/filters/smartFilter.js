class SmartFilter {
    constructor() {
        this.minLiquidity = config.get('MIN_LIQUIDITY', 1000);
        this.minHolders = config.get('MIN_HOLDERS', 100);
        this.maxSlippage = config.get('MAX_SLIPPAGE', 5);
        this.volumeThreshold = config.get('MIN_VOLUME_24H', 10000);
        this.priceVolatilityThreshold = 0.15; // 15% price volatility threshold
        this.volumeSpikeThreshold = 2.0; // 2x normal volume
    }

    async evaluateToken(tokenMint) {
        try {
            // Get token data from Jupiter
            const tokenData = await jupiterApi.getTokenData(tokenMint);
            if (!tokenData) {
                logger.warning(`No token data found for ${tokenMint}`);
                return 0;
            }

            // Validate liquidity
            const liquidityScore = await this.validateLiquidity(tokenData);
            if (liquidityScore < 0.5) {
                return 0;
            }

            // Check holder distribution
            const holderScore = await this.checkHolderDistribution(tokenMint);
            if (holderScore < 0.5) {
                return 0;
            }

            // Analyze market data
            const marketScore = await this.analyzeMarketData(tokenMint);
            if (marketScore < 0.5) {
                return 0;
            }

            // Calculate final safety score
            const finalScore = (liquidityScore + holderScore + marketScore) / 3;
            logger.info(`Safety score for ${tokenMint}: ${finalScore}`);
            return finalScore;
        } catch (error) {
            logger.error(`Error evaluating token ${tokenMint}:`, error.message);
            return 0;
        }
    }

    async validateLiquidity(tokenData) {
        try {
            // Check if token has sufficient liquidity
            if (tokenData.liquidity < this.minLiquidity) {
                logger.warning(`Insufficient liquidity for token: ${tokenData.liquidity}`);
                return 0;
            }

            // Check if liquidity is locked
            const isLiquidityLocked = await this.checkLiquidityLock(tokenData);
            if (!isLiquidityLocked) {
                logger.warning('Liquidity is not locked');
                return 0.3;
            }

            // Calculate liquidity score based on multiple factors
            const liquidityScore = this.calculateLiquidityScore(tokenData);
            return liquidityScore;
        } catch (error) {
            logger.error('Error validating liquidity:', error.message);
            return 0;
        }
    }

    async checkHolderDistribution(tokenMint) {
        try {
            // Get holder data from Solana explorer
            const holderData = await solanaExplorer.getTokenHolders(tokenMint);
            
            // Check minimum holder count
            if (holderData.totalHolders < this.minHolders) {
                logger.warning(`Insufficient holders: ${holderData.totalHolders}`);
                return 0;
            }

            // Check for suspicious holder distribution
            const topHolders = holderData.holders.slice(0, 10);
            const topHoldersPercentage = topHolders.reduce((sum, holder) => sum + holder.percentage, 0);
            
            if (topHoldersPercentage > 50) {
                logger.warning(`High concentration in top holders: ${topHoldersPercentage}%`);
                return 0.3;
            }

            // Calculate holder distribution score
            const distributionScore = this.calculateDistributionScore(holderData);
            return distributionScore;
        } catch (error) {
            logger.error('Error checking holder distribution:', error.message);
            return 0;
        }
    }

    async analyzeMarketData(tokenMint) {
        try {
            // Get real-time market data
            const marketData = await marketAnalyzer.getMarketData(tokenMint);
            
            // Check 24h volume
            if (marketData.volume24h < this.volumeThreshold) {
                logger.warning(`Low 24h volume: ${marketData.volume24h}`);
                return 0.3;
            }

            // Check price stability
            const priceStability = this.checkPriceStability(marketData);
            if (priceStability < 0.5) {
                logger.warning('Unstable price movement detected');
                return 0.3;
            }

            // Check for suspicious trading patterns
            const tradingPatterns = this.analyzeTradingPatterns(marketData);
            if (tradingPatterns < 0.5) {
                logger.warning('Suspicious trading patterns detected');
                return 0.3;
            }

            // Calculate market score
            const marketScore = this.calculateMarketScore(marketData);
            return marketScore;
        } catch (error) {
            logger.error('Error analyzing market data:', error.message);
            return 0;
        }
    }

    // Helper methods for score calculations
    calculateLiquidityScore(tokenData) {
        try {
            let score = 0;
            const weights = {
                baseLiquidity: 0.3,
                liquidityDepth: 0.3,
                liquidityStability: 0.2,
                poolDistribution: 0.2
            };

            // Base liquidity score (0-1)
            const baseLiquidityScore = Math.min(tokenData.liquidity / (this.minLiquidity * 10), 1);
            score += baseLiquidityScore * weights.baseLiquidity;

            // Liquidity depth analysis
            const liquidityDepthScore = this.analyzeLiquidityDepth(tokenData.liquidityLevels);
            score += liquidityDepthScore * weights.liquidityDepth;

            // Liquidity stability (check if liquidity has been stable)
            const liquidityStabilityScore = this.analyzeLiquidityStability(tokenData.liquidityHistory);
            score += liquidityStabilityScore * weights.liquidityStability;

            // Pool distribution analysis
            const poolDistributionScore = this.analyzePoolDistribution(tokenData.pools);
            score += poolDistributionScore * weights.poolDistribution;

            return Math.min(score, 1); // Ensure score doesn't exceed 1
        } catch (error) {
            logger.error('Error calculating liquidity score:', error.message);
            return 0.5; // Return neutral score on error
        }
    }

    calculateDistributionScore(holderData) {
        try {
            let score = 0;
            const weights = {
                holderCount: 0.2,
                topHolderConcentration: 0.3,
                distributionEvenness: 0.3,
                recentHolderChanges: 0.2
            };

            // Holder count score
            const holderCountScore = Math.min(holderData.totalHolders / (this.minHolders * 2), 1);
            score += holderCountScore * weights.holderCount;

            // Top holder concentration analysis
            const topHolders = holderData.holders.slice(0, 10);
            const topHoldersPercentage = topHolders.reduce((sum, holder) => sum + holder.percentage, 0);
            const concentrationScore = 1 - (topHoldersPercentage / 100); // Invert the percentage
            score += concentrationScore * weights.topHolderConcentration;

            // Distribution evenness (Gini coefficient)
            const giniScore = this.calculateGiniCoefficient(holderData.holders);
            score += giniScore * weights.distributionEvenness;

            // Recent holder changes analysis
            const holderChangeScore = this.analyzeHolderChanges(holderData.recentChanges);
            score += holderChangeScore * weights.recentHolderChanges;

            return Math.min(score, 1);
        } catch (error) {
            logger.error('Error calculating distribution score:', error.message);
            return 0.5;
        }
    }

    checkPriceStability(marketData) {
        try {
            let score = 0;
            const weights = {
                volatility: 0.4,
                trendStability: 0.3,
                supportResistance: 0.3
            };

            // Price volatility analysis
            const volatilityScore = this.analyzePriceVolatility(marketData.priceHistory);
            score += volatilityScore * weights.volatility;

            // Trend stability analysis
            const trendScore = this.analyzeTrendStability(marketData.priceHistory);
            score += trendScore * weights.trendStability;

            // Support/Resistance analysis
            const srScore = this.analyzeSupportResistance(marketData.priceHistory);
            score += srScore * weights.supportResistance;

            return Math.min(score, 1);
        } catch (error) {
            logger.error('Error checking price stability:', error.message);
            return 0.5;
        }
    }

    analyzeTradingPatterns(marketData) {
        try {
            let score = 0;
            const weights = {
                volumeAnalysis: 0.3,
                tradeSizeDistribution: 0.3,
                timePatterns: 0.2,
                correlationAnalysis: 0.2
            };

            // Volume analysis
            const volumeScore = this.analyzeVolumePatterns(marketData.volumeHistory);
            score += volumeScore * weights.volumeAnalysis;

            // Trade size distribution
            const tradeSizeScore = this.analyzeTradeSizeDistribution(marketData.trades);
            score += tradeSizeScore * weights.tradeSizeDistribution;

            // Time-based pattern analysis
            const timePatternScore = this.analyzeTimePatterns(marketData.trades);
            score += timePatternScore * weights.timePatterns;

            // Correlation with market indices
            const correlationScore = this.analyzeMarketCorrelation(marketData.priceHistory);
            score += correlationScore * weights.correlationAnalysis;

            return Math.min(score, 1);
        } catch (error) {
            logger.error('Error analyzing trading patterns:', error.message);
            return 0.5;
        }
    }

    calculateMarketScore(marketData) {
        try {
            let score = 0;
            const weights = {
                volumeQuality: 0.3,
                priceAction: 0.3,
                marketDepth: 0.2,
                tradingActivity: 0.2
            };

            // Volume quality analysis
            const volumeScore = this.analyzeVolumeQuality(marketData.volumeHistory);
            score += volumeScore * weights.volumeQuality;

            // Price action analysis
            const priceActionScore = this.analyzePriceAction(marketData.priceHistory);
            score += priceActionScore * weights.priceAction;

            // Market depth analysis
            const depthScore = this.analyzeMarketDepth(marketData.orderBook);
            score += depthScore * weights.marketDepth;

            // Trading activity analysis
            const activityScore = this.analyzeTradingActivity(marketData.trades);
            score += activityScore * weights.tradingActivity;

            return Math.min(score, 1);
        } catch (error) {
            logger.error('Error calculating market score:', error.message);
            return 0.5;
        }
    }

    // Helper analysis methods
    analyzeLiquidityDepth(liquidityLevels) {
        // Analyze liquidity at different price levels
        const depthScore = liquidityLevels.reduce((score, level) => {
            return score + (level.amount / this.minLiquidity);
        }, 0) / liquidityLevels.length;
        return Math.min(depthScore, 1);
    }

    analyzeLiquidityStability(liquidityHistory) {
        // Check if liquidity has been stable over time
        const changes = liquidityHistory.map((point, i) => {
            if (i === 0) return 0;
            return Math.abs(point.liquidity - liquidityHistory[i-1].liquidity) / liquidityHistory[i-1].liquidity;
        });
        const averageChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
        return 1 - Math.min(averageChange, 1);
    }

    analyzePoolDistribution(pools) {
        // Analyze how liquidity is distributed across different pools
        const totalLiquidity = pools.reduce((sum, pool) => sum + pool.liquidity, 0);
        const distributionScore = pools.reduce((score, pool) => {
            const weight = pool.liquidity / totalLiquidity;
            return score + (weight * (1 - Math.abs(0.5 - weight)));
        }, 0);
        return distributionScore * 2; // Normalize to 0-1 range
    }

    calculateGiniCoefficient(holders) {
        // Calculate Gini coefficient for holder distribution
        const sortedHoldings = holders.map(h => h.percentage).sort((a, b) => a - b);
        const n = sortedHoldings.length;
        const sum = sortedHoldings.reduce((a, b) => a + b, 0);
        const sumOfProducts = sortedHoldings.reduce((sum, x, i) => sum + x * (i + 1), 0);
        const gini = (2 * sumOfProducts) / (n * sum) - (n + 1) / n;
        return 1 - gini; // Invert so higher is better
    }

    analyzeHolderChanges(recentChanges) {
        // Analyze recent changes in holder distribution
        const changeScore = recentChanges.reduce((score, change) => {
            const magnitude = Math.abs(change.percentageChange);
            return score + (1 - Math.min(magnitude, 1));
        }, 0) / recentChanges.length;
        return changeScore;
    }

    analyzePriceVolatility(priceHistory) {
        // Calculate price volatility
        const returns = priceHistory.map((price, i) => {
            if (i === 0) return 0;
            return (price - priceHistory[i-1]) / priceHistory[i-1];
        });
        const volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length);
        return 1 - Math.min(volatility / this.priceVolatilityThreshold, 1);
    }

    analyzeTrendStability(priceHistory) {
        // Analyze price trend stability
        const trends = priceHistory.map((price, i) => {
            if (i < 2) return 0;
            return (price - priceHistory[i-1]) * (priceHistory[i-1] - priceHistory[i-2]);
        });
        const stabilityScore = trends.filter(t => t > 0).length / trends.length;
        return stabilityScore;
    }

    analyzeSupportResistance(priceHistory) {
        // Identify and analyze support/resistance levels
        const levels = this.identifySupportResistance(priceHistory);
        const strengthScore = levels.reduce((score, level) => {
            return score + level.strength;
        }, 0) / levels.length;
        return strengthScore;
    }

    analyzeVolumePatterns(volumeHistory) {
        // Analyze volume patterns for manipulation
        const avgVolume = volumeHistory.reduce((sum, v) => sum + v, 0) / volumeHistory.length;
        const volumeSpikes = volumeHistory.filter(v => v > avgVolume * this.volumeSpikeThreshold);
        const spikeScore = 1 - (volumeSpikes.length / volumeHistory.length);
        return spikeScore;
    }

    analyzeTradeSizeDistribution(trades) {
        // Analyze distribution of trade sizes
        const sizes = trades.map(t => t.size);
        const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
        const stdDev = Math.sqrt(sizes.reduce((sum, s) => sum + Math.pow(s - avgSize, 2), 0) / sizes.length);
        const distributionScore = 1 - Math.min(stdDev / avgSize, 1);
        return distributionScore;
    }

    analyzeTimePatterns(trades) {
        // Analyze trading patterns over time
        const timeGroups = this.groupTradesByTime(trades);
        const patternScore = 1 - this.calculateTimePatternDeviation(timeGroups);
        return patternScore;
    }

    analyzeMarketCorrelation(priceHistory) {
        // Analyze correlation with market indices
        // This would require market index data
        return 0.8; // Placeholder
    }

    analyzeVolumeQuality(volumeHistory) {
        // Analyze quality of volume (real vs wash trading)
        const volumeScore = this.analyzeVolumePatterns(volumeHistory);
        const tradeSizeScore = this.analyzeTradeSizeDistribution(volumeHistory);
        return (volumeScore + tradeSizeScore) / 2;
    }

    analyzePriceAction(priceHistory) {
        // Analyze price action patterns
        const volatilityScore = this.analyzePriceVolatility(priceHistory);
        const trendScore = this.analyzeTrendStability(priceHistory);
        return (volatilityScore + trendScore) / 2;
    }

    analyzeMarketDepth(orderBook) {
        // Analyze order book depth
        const bidDepth = this.calculateOrderBookDepth(orderBook.bids);
        const askDepth = this.calculateOrderBookDepth(orderBook.asks);
        return (bidDepth + askDepth) / 2;
    }

    analyzeTradingActivity(trades) {
        // Analyze overall trading activity
        const timePatternScore = this.analyzeTimePatterns(trades);
        const correlationScore = this.analyzeMarketCorrelation(trades);
        return (timePatternScore + correlationScore) / 2;
    }

    // Utility methods
    identifySupportResistance(priceHistory) {
        // Identify support and resistance levels
        const levels = [];
        const window = 5;
        
        for (let i = window; i < priceHistory.length - window; i++) {
            const localMax = Math.max(...priceHistory.slice(i - window, i + window));
            const localMin = Math.min(...priceHistory.slice(i - window, i + window));
            
            if (priceHistory[i] === localMax) {
                levels.push({ price: priceHistory[i], type: 'resistance', strength: 1 });
            } else if (priceHistory[i] === localMin) {
                levels.push({ price: priceHistory[i], type: 'support', strength: 1 });
            }
        }
        
        return this.mergeNearbyLevels(levels);
    }

    mergeNearbyLevels(levels) {
        // Merge nearby support/resistance levels
        const merged = [];
        const threshold = 0.01; // 1% threshold for merging
        
        levels.forEach(level => {
            const nearby = merged.find(l => 
                Math.abs(l.price - level.price) / l.price < threshold
            );
            
            if (nearby) {
                nearby.strength += level.strength;
            } else {
                merged.push({ ...level });
            }
        });
        
        return merged;
    }

    groupTradesByTime(trades) {
        // Group trades by time intervals
        const intervals = {};
        trades.forEach(trade => {
            const timeKey = Math.floor(trade.timestamp / (60 * 60 * 1000)); // Group by hour
            if (!intervals[timeKey]) {
                intervals[timeKey] = [];
            }
            intervals[timeKey].push(trade);
        });
        return intervals;
    }

    calculateTimePatternDeviation(timeGroups) {
        // Calculate deviation from normal trading patterns
        const avgTradesPerInterval = Object.values(timeGroups)
            .reduce((sum, trades) => sum + trades.length, 0) / Object.keys(timeGroups).length;
        
        const deviation = Object.values(timeGroups)
            .reduce((sum, trades) => sum + Math.abs(trades.length - avgTradesPerInterval), 0) 
            / (Object.keys(timeGroups).length * avgTradesPerInterval);
        
        return Math.min(deviation, 1);
    }

    calculateOrderBookDepth(orders) {
        // Calculate order book depth
        const totalDepth = orders.reduce((sum, order) => sum + order.size, 0);
        const weightedDepth = orders.reduce((sum, order, i) => {
            return sum + (order.size * (1 - i / orders.length));
        }, 0);
        return weightedDepth / totalDepth;
    }
} 