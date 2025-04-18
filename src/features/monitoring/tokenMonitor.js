const axios = require('axios');
const path = require('path');
const fs = require('fs');

class TokenMonitor {
    constructor() {
        this.metricsFile = path.join(__dirname, '../../data/metrics/token_metrics.json');
        this.ensureMetricsFile();
    }

    ensureMetricsFile() {
        if (!fs.existsSync(this.metricsFile)) {
            fs.writeFileSync(this.metricsFile, JSON.stringify({}, null, 2));
        }
    }

    async updateTokenMetrics(tokenAddress, metrics) {
        try {
            const currentMetrics = this.loadMetrics();
            currentMetrics[tokenAddress] = {
                ...currentMetrics[tokenAddress],
                ...metrics,
                lastUpdated: new Date().toISOString()
            };
            this.saveMetrics(currentMetrics);
        } catch (error) {
            console.error('Failed to update token metrics:', error.message);
        }
    }

    loadMetrics() {
        try {
            return JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
        } catch (error) {
            console.error('Failed to load token metrics:', error.message);
            return {};
        }
    }

    saveMetrics(metrics) {
        try {
            fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
        } catch (error) {
            console.error('Failed to save token metrics:', error.message);
        }
    }

    async fetchTokenMetrics(tokenAddress) {
        try {
            const response = await axios.get(`https://api.helius.xyz/v0/token-metadata?api-key=${process.env.HELIUS_API_KEY}`, {
                params: {
                    mintAccounts: [tokenAddress]
                }
            });
            return response.data[0];
        } catch (error) {
            console.error('Failed to fetch token metrics:', error.message);
            return null;
        }
    }

    getTokenPerformance(tokenAddress) {
        const metrics = this.loadMetrics();
        const tokenData = metrics[tokenAddress];
        if (!tokenData) return null;

        return {
            priceChange: tokenData.currentPrice - tokenData.initialPrice,
            priceChangePercent: ((tokenData.currentPrice - tokenData.initialPrice) / tokenData.initialPrice) * 100,
            volume24h: tokenData.volume24h || 0,
            liquidity: tokenData.liquidity || 0,
            lastUpdated: tokenData.lastUpdated
        };
    }

    async trackTokenPerformance(tokenAddress, initialPrice) {
        const metrics = await this.fetchTokenMetrics(tokenAddress);
        if (!metrics) return null;

        const performanceData = {
            initialPrice,
            currentPrice: metrics.price || initialPrice,
            volume24h: metrics.volume24h || 0,
            liquidity: metrics.liquidity || 0,
            lastUpdated: new Date().toISOString()
        };

        await this.updateTokenMetrics(tokenAddress, performanceData);
        return performanceData;
    }
}

module.exports = new TokenMonitor(); 