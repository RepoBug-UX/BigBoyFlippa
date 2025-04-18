/**
 * Interface defining the contract for trade data operations
 * @interface ITradeRepository
 */
class ITradeRepository {
    /**
     * Saves a trade record and updates related performance metrics
     * @param {Object} tradeInfo - Trade information to save
     * @param {string} tradeInfo.tokenMint - Token mint address
     * @param {string} tradeInfo.tokenSymbol - Token symbol
     * @param {string} tradeInfo.strategy - Strategy used
     * @param {number} tradeInfo.entryPrice - Entry price
     * @param {number} tradeInfo.exitPrice - Exit price
     * @param {number} tradeInfo.solIn - SOL amount invested
     * @param {number} tradeInfo.solOut - SOL amount returned
     * @param {number} tradeInfo.pnl - Profit/Loss in SOL
     * @param {number} tradeInfo.pnlPercent - Profit/Loss percentage
     * @param {string} tradeInfo.buyTx - Buy transaction ID
     * @param {string} tradeInfo.sellTx - Sell transaction ID
     * @param {number} tradeInfo.liquidity - Token liquidity at trade
     * @param {number} tradeInfo.volume24h - 24h volume at trade
     * @param {string} tradeInfo.entryReason - Reason for entry
     * @param {string} tradeInfo.exitReason - Reason for exit
     * @param {string} tradeInfo.marketCondition - Market condition
     * @returns {Promise<boolean>} Success status
     */
    async saveTrade(tradeInfo) {}

    /**
     * Updates performance metrics for a strategy
     * @param {string} strategy - Strategy name
     * @param {number} pnlPercent - Profit/Loss percentage
     * @returns {Promise<void>}
     */
    async updateStrategyPerformance(strategy, pnlPercent) {}

    /**
     * Updates performance metrics for a token
     * @param {string} tokenMint - Token mint address
     * @param {string} tokenSymbol - Token symbol
     * @param {number} pnlPercent - Profit/Loss percentage
     * @returns {Promise<void>}
     */
    async updateTokenPerformance(tokenMint, tokenSymbol, pnlPercent) {}

    /**
     * Gets performance statistics for a strategy
     * @param {string} strategy - Strategy name
     * @returns {Promise<Object|null>} Strategy statistics or null if not found
     */
    async getStrategyStats(strategy) {}

    /**
     * Gets performance statistics for a token
     * @param {string} tokenMint - Token mint address
     * @returns {Promise<Object|null>} Token statistics or null if not found
     */
    async getTokenStats(tokenMint) {}

    /**
     * Gets top performing strategies
     * @param {number} [limit=5] - Number of strategies to return
     * @returns {Promise<Array>} Array of top performing strategies
     */
    async getTopPerformingStrategies(limit = 5) {}

    /**
     * Gets top performing tokens
     * @param {number} [limit=5] - Number of tokens to return
     * @returns {Promise<Array>} Array of top performing tokens
     */
    async getTopPerformingTokens(limit = 5) {}
}

module.exports = ITradeRepository; 