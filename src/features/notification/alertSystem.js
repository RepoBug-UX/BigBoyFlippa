const logger = require('../../core/utils/logger');

class AlertSystem {
    constructor() {
        this.notifications = [];
    }

    async sendTradeAlert(tradeInfo) {
        const { tokenSymbol, strategy, solIn, solOut, pnl, pnlPercent } = tradeInfo;
        const message = `📊 Trade Alert:
Token: ${tokenSymbol}
Strategy: ${strategy}
Amount In: ${solIn} SOL
Amount Out: ${solOut} SOL
PnL: ${pnl} SOL (${pnlPercent}%)
Status: ${pnl >= 0 ? '✅ Profit' : '❌ Loss'}`;

        logger.info(message);
        this.notifications.push({
            type: 'trade',
            timestamp: new Date(),
            message
        });
    }

    async sendErrorAlert(error, context) {
        const message = `⚠️ Error Alert:
Context: ${context}
Error: ${error.message}`;

        logger.error(message);
        this.notifications.push({
            type: 'error',
            timestamp: new Date(),
            message
        });
    }

    async sendMarketAlert(condition, metrics) {
        const message = `📈 Market Alert:
Condition: ${condition}
Metrics: ${JSON.stringify(metrics, null, 2)}`;

        logger.info(message);
        this.notifications.push({
            type: 'market',
            timestamp: new Date(),
            message
        });
    }

    getRecentNotifications(limit = 10) {
        return this.notifications.slice(-limit);
    }
}

module.exports = new AlertSystem(); 