const fs = require('fs');
const path = require('path');

class TradeLogger {
    constructor() {
        this.csvPath = path.join(__dirname, '../../data/trades/trade_log.csv');
        this.strategyPath = path.join(__dirname, '../../data/strategies/strategy_performance.json');
        this.tokenPath = path.join(__dirname, '../../data/metrics/token_performance.json');
        this.ensureFiles();
    }

    ensureFiles() {
        // Ensure CSV file exists with headers
        if (!fs.existsSync(this.csvPath)) {
            const header = 'timestamp,token_mint,token_symbol,strategy,entry_price,exit_price,sol_in,sol_out,pnl,pnl_percent,buy_tx,sell_tx,liquidity,volume_24h,entry_reason,exit_reason,market_condition\n';
            fs.writeFileSync(this.csvPath, header);
        }

        // Ensure strategy performance file exists
        if (!fs.existsSync(this.strategyPath)) {
            fs.writeFileSync(this.strategyPath, JSON.stringify({}, null, 2));
        }

        // Ensure token performance file exists
        if (!fs.existsSync(this.tokenPath)) {
            fs.writeFileSync(this.tokenPath, JSON.stringify({}, null, 2));
        }
    }

    logTrade(tradeInfo) {
        const {
            timestamp = new Date().toISOString(),
            tokenMint,
            tokenSymbol,
            strategy,
            entryPrice,
            exitPrice,
            solIn,
            solOut,
            pnl,
            pnlPercent,
            buyTx,
            sellTx,
            liquidity,
            volume24h,
            entryReason,
            exitReason,
            marketCondition
        } = tradeInfo;

        // Log to CSV
        const csvLine = `${timestamp},${tokenMint},${tokenSymbol},${strategy},${entryPrice},${exitPrice},${solIn},${solOut},${pnl},${pnlPercent},${buyTx},${sellTx},${liquidity},${volume24h},${entryReason},${exitReason},${marketCondition}\n`;
        fs.appendFileSync(this.csvPath, csvLine);

        // Update strategy performance
        this.updateStrategyPerformance(strategy, pnlPercent);

        // Update token performance
        this.updateTokenPerformance(tokenMint, tokenSymbol, pnlPercent);

        // Log to console with emoji
        const emoji = pnl >= 0 ? '📈' : '📉';
        console.log(`${emoji} Trade logged: ${tokenSymbol} | Strategy: ${strategy} | PnL: ${pnl.toFixed(6)} SOL (${pnlPercent.toFixed(2)}%)`);
    }

    updateStrategyPerformance(strategy, pnlPercent) {
        try {
            const data = JSON.parse(fs.readFileSync(this.strategyPath, 'utf8'));
            if (!data[strategy]) {
                data[strategy] = {
                    totalTrades: 0,
                    winningTrades: 0,
                    totalPnL: 0,
                    avgPnL: 0,
                    bestTrade: -Infinity,
                    worstTrade: Infinity
                };
            }

            const stats = data[strategy];
            stats.totalTrades++;
            if (pnlPercent > 0) stats.winningTrades++;
            stats.totalPnL += pnlPercent;
            stats.avgPnL = stats.totalPnL / stats.totalTrades;
            stats.bestTrade = Math.max(stats.bestTrade, pnlPercent);
            stats.worstTrade = Math.min(stats.worstTrade, pnlPercent);

            fs.writeFileSync(this.strategyPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to update strategy performance:', error.message);
        }
    }

    updateTokenPerformance(tokenMint, tokenSymbol, pnlPercent) {
        try {
            const data = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
            if (!data[tokenMint]) {
                data[tokenMint] = {
                    symbol: tokenSymbol,
                    totalTrades: 0,
                    winningTrades: 0,
                    totalPnL: 0,
                    avgPnL: 0,
                    bestTrade: -Infinity,
                    worstTrade: Infinity,
                    lastTrade: new Date().toISOString()
                };
            }

            const stats = data[tokenMint];
            stats.totalTrades++;
            if (pnlPercent > 0) stats.winningTrades++;
            stats.totalPnL += pnlPercent;
            stats.avgPnL = stats.totalPnL / stats.totalTrades;
            stats.bestTrade = Math.max(stats.bestTrade, pnlPercent);
            stats.worstTrade = Math.min(stats.worstTrade, pnlPercent);
            stats.lastTrade = new Date().toISOString();

            fs.writeFileSync(this.tokenPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to update token performance:', error.message);
        }
    }

    getStrategyStats(strategy) {
        try {
            const data = JSON.parse(fs.readFileSync(this.strategyPath, 'utf8'));
            return data[strategy] || null;
        } catch (error) {
            console.error('Failed to get strategy stats:', error.message);
            return null;
        }
    }

    getTokenStats(tokenMint) {
        try {
            const data = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
            return data[tokenMint] || null;
        } catch (error) {
            console.error('Failed to get token stats:', error.message);
            return null;
        }
    }

    getTopPerformingStrategies(limit = 5) {
        try {
            const data = JSON.parse(fs.readFileSync(this.strategyPath, 'utf8'));
            return Object.entries(data)
                .map(([strategy, stats]) => ({
                    strategy,
                    ...stats
                }))
                .sort((a, b) => b.avgPnL - a.avgPnL)
                .slice(0, limit);
        } catch (error) {
            console.error('Failed to get top strategies:', error.message);
            return [];
        }
    }

    getTopPerformingTokens(limit = 5) {
        try {
            const data = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8'));
            return Object.entries(data)
                .map(([mint, stats]) => ({
                    mint,
                    ...stats
                }))
                .sort((a, b) => b.avgPnL - a.avgPnL)
                .slice(0, limit);
        } catch (error) {
            console.error('Failed to get top tokens:', error.message);
            return [];
        }
    }
}

module.exports = new TradeLogger(); 