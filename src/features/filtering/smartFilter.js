const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SmartFilter {
    constructor() {
        this.metricsFile = path.join(__dirname, '../../data/metrics/token_metrics.json');
        this.ensureMetricsFile();
    }

    ensureMetricsFile() {
        if (!fs.existsSync(this.metricsFile)) {
            fs.writeFileSync(this.metricsFile, JSON.stringify({}, null, 2));
        }
    }

    async evaluateToken(tokenAddress) {
        try {
            // Fetch token metadata and metrics
            const tokenData = await this.fetchTokenData(tokenAddress);
            if (!tokenData) return null;

            // Check ownership status
            const ownershipStatus = await this.checkOwnershipStatus(tokenAddress);
            
            // Get historical metrics
            const historicalMetrics = this.getHistoricalMetrics(tokenAddress);

            // Calculate safety score
            const safetyScore = this.calculateSafetyScore(tokenData, ownershipStatus, historicalMetrics);

            return {
                tokenAddress,
                safetyScore,
                ownershipStatus,
                currentMetrics: tokenData,
                historicalMetrics,
                isSafe: safetyScore >= 0.7, // Threshold for considering a token safe
                warnings: this.getWarnings(tokenData, ownershipStatus, historicalMetrics)
            };
        } catch (error) {
            console.error('Error evaluating token:', error.message);
            return null;
        }
    }

    async fetchTokenData(tokenAddress) {
        try {
            const response = await axios.get(`https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`, {
                params: {
                    mintAccounts: [tokenAddress]
                }
            });
            return response.data[0];
        } catch (error) {
            console.error('Failed to fetch token data:', error.message);
            return null;
        }
    }

    async checkOwnershipStatus(tokenAddress) {
        try {
            const response = await axios.get(`https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`, {
                params: {
                    mintAccounts: [tokenAddress]
                }
            });
            
            const tokenData = response.data[0];
            return {
                isRenounced: tokenData.owner === null || tokenData.owner === '11111111111111111111111111111111',
                owner: tokenData.owner,
                lastOwnerChange: tokenData.lastOwnerChange
            };
        } catch (error) {
            console.error('Failed to check ownership status:', error.message);
            return {
                isRenounced: false,
                owner: null,
                lastOwnerChange: null
            };
        }
    }

    getHistoricalMetrics(tokenAddress) {
        try {
            const metrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
            return metrics[tokenAddress] || null;
        } catch (error) {
            console.error('Failed to get historical metrics:', error.message);
            return null;
        }
    }

    calculateSafetyScore(tokenData, ownershipStatus, historicalMetrics) {
        let score = 0;
        const weights = {
            ownership: 0.4,
            liquidity: 0.2,
            volume: 0.3,
            age: 0.1
        };

        // Ownership score
        score += ownershipStatus.isRenounced ? weights.ownership : 0;

        // Liquidity score (normalized between 0 and 1)
        const minLiquidity = 10;
        const liquidityScore = Math.min(tokenData.liquidity / minLiquidity, 1);
        score += liquidityScore * weights.liquidity;

        // Volume consistency score
        if (historicalMetrics) {
            const volumeScores = historicalMetrics.map(m => {
                const volumeScore = Math.min(m.volume24h / (minLiquidity * 0.5), 1);
                return volumeScore;
            });
            const avgVolumeScore = volumeScores.reduce((a, b) => a + b, 0) / volumeScores.length;
            score += avgVolumeScore * weights.volume;
        }

        // Age score (older tokens are generally safer)
        if (tokenData.createdAt) {
            const ageInDays = (Date.now() - new Date(tokenData.createdAt).getTime()) / (1000 * 60 * 60 * 24);
            const ageScore = Math.min(ageInDays / 30, 1); // Normalize to 30 days
            score += ageScore * weights.age;
        }

        return score;
    }

    getWarnings(tokenData, ownershipStatus, historicalMetrics) {
        const warnings = [];

        if (!ownershipStatus.isRenounced) {
            warnings.push('Token ownership not renounced');
        }

        if (tokenData.liquidity < 1000) {
            warnings.push(`Low liquidity: ${tokenData.liquidity} SOL`);
        }

        if (historicalMetrics) {
            const recentVolumes = historicalMetrics.slice(-5).map(m => m.volume24h);
            const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
            if (avgVolume < 100) {
                warnings.push(`Low average volume: ${avgVolume.toFixed(2)} SOL`);
            }

            const volumeStdDev = this.calculateStandardDeviation(recentVolumes);
            if (volumeStdDev > avgVolume * 0.5) {
                warnings.push('Inconsistent trading volume');
            }
        }

        return warnings;
    }

    calculateStandardDeviation(numbers) {
        const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
        const squareDiffs = numbers.map(num => Math.pow(num - mean, 2));
        const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
        return Math.sqrt(avgSquareDiff);
    }

    async filterTokens(tokenAddresses) {
        const results = [];
        for (const address of tokenAddresses) {
            const evaluation = await this.evaluateToken(address);
            if (evaluation) {
                results.push(evaluation);
            }
        }
        return results.sort((a, b) => b.safetyScore - a.safetyScore);
    }
}

module.exports = new SmartFilter(); 