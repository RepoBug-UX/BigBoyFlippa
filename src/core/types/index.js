/**
 * @typedef {Object} Token
 * @property {string} mint - Token mint address
 * @property {string} symbol - Token symbol
 * @property {number} price - Current price in SOL
 * @property {number} liquidity - Current liquidity in SOL
 * @property {number} volume24h - 24h volume in SOL
 * @property {Date} createdAt - Token creation date
 */

/**
 * @typedef {Object} Trade
 * @property {string} tokenMint - Token mint address
 * @property {string} tokenSymbol - Token symbol
 * @property {string} strategy - Strategy used
 * @property {number} entryPrice - Entry price in SOL
 * @property {number} exitPrice - Exit price in SOL
 * @property {number} solIn - SOL amount invested
 * @property {number} solOut - SOL amount received
 * @property {number} pnl - Profit/Loss in SOL
 * @property {number} pnlPercent - Profit/Loss percentage
 * @property {string} buyTx - Buy transaction hash
 * @property {string} sellTx - Sell transaction hash
 * @property {string} entryReason - Reason for entry
 * @property {string} exitReason - Reason for exit
 * @property {string} marketCondition - Market condition at time of trade
 */

/**
 * @typedef {Object} Strategy
 * @property {string} name - Strategy name
 * @property {string} description - Strategy description
 * @property {Object} parameters - Strategy parameters
 * @property {number} parameters.minLiquidity - Minimum liquidity in SOL
 * @property {number} parameters.minVolume - Minimum volume in SOL
 * @property {number} parameters.maxSlippage - Maximum slippage percentage
 * @property {number} parameters.takeProfit - Take profit percentage
 * @property {number} parameters.stopLoss - Stop loss percentage
 */

/**
 * @typedef {Object} TokenMetrics
 * @property {string} mint - Token mint address
 * @property {string} symbol - Token symbol
 * @property {number} totalTrades - Total number of trades
 * @property {number} winningTrades - Number of winning trades
 * @property {number} totalPnL - Total PnL percentage
 * @property {number} avgPnL - Average PnL percentage
 * @property {number} bestTrade - Best trade percentage
 * @property {number} worstTrade - Worst trade percentage
 * @property {Date} lastTrade - Last trade timestamp
 */

/**
 * @typedef {Object} StrategyMetrics
 * @property {string} strategy - Strategy name
 * @property {number} totalTrades - Total number of trades
 * @property {number} winningTrades - Number of winning trades
 * @property {number} totalPnL - Total PnL percentage
 * @property {number} avgPnL - Average PnL percentage
 * @property {number} bestTrade - Best trade percentage
 * @property {number} worstTrade - Worst trade percentage
 */

/**
 * @typedef {Object} MarketCondition
 * @property {string} trend - Market trend (bullish/bearish/neutral)
 * @property {number} strength - Trend strength (0-1)
 * @property {number} volatility - Market volatility (0-1)
 * @property {string} sentiment - Market sentiment (positive/negative/neutral)
 */

/**
 * @typedef {Object} TradeSignal
 * @property {string} tokenMint - Token mint address
 * @property {string} tokenSymbol - Token symbol
 * @property {string} action - Action to take (buy/sell)
 * @property {number} price - Target price
 * @property {number} amount - Amount to trade
 * @property {string} reason - Reason for the signal
 * @property {Object} metrics - Token metrics
 * @property {Object} marketCondition - Current market condition
 */

// DEX Types
const DEX_TYPES = {
    Route: {
        inAmount: 'number',
        outAmount: 'number',
        priceImpact: 'number',
        marketInfos: 'array',
        amount: 'number',
        slippageBps: 'number',
        otherAmountThreshold: 'number'
    },
    SwapResult: {
        success: 'boolean',
        txId: 'string',
        route: 'object',
        amountIn: 'number',
        amountOut: 'number',
        price: 'number'
    }
};

// Wallet Types
const WALLET_TYPES = {
    WalletInfo: {
        publicKey: 'string',
        balance: 'number',
        lastUpdated: 'string'
    },
    TransactionInfo: {
        txId: 'string',
        type: 'string',
        amount: 'number',
        fee: 'number',
        timestamp: 'string',
        status: 'string'
    }
};

// Market Types
const MARKET_TYPES = {
    MarketData: {
        price: 'number',
        volume24h: 'number',
        liquidity: 'number',
        timestamp: 'string'
    },
    MarketCondition: {
        condition: 'string',
        confidence: 'number',
        indicators: 'object'
    },
    PriceImpact: {
        impact: 'number',
        maxImpact: 'number',
        recommendedAmount: 'number'
    }
};

// Risk Types
const RISK_TYPES = {
    Position: {
        tokenMint: 'string',
        entryPrice: 'number',
        amount: 'number',
        entryTime: 'string',
        status: 'string'
    },
    RiskMetrics: {
        dailyPnL: 'number',
        maxDrawdown: 'number',
        sharpeRatio: 'number',
        winRate: 'number'
    },
    TradeValidation: {
        isValid: 'boolean',
        reasons: 'array',
        recommendedSize: 'number'
    }
};

// Trading Types
const TRADING_TYPES = {
    TradeParams: {
        tokenMint: 'string',
        tokenSymbol: 'string',
        strategy: 'string',
        amount: 'number',
        slippage: 'number',
        entryReason: 'string'
    },
    TradeResult: {
        success: 'boolean',
        tradeInfo: 'object',
        error: 'string'
    }
};

const Token = {
    mint: 'string',
    symbol: 'string',
    price: 'number',
    liquidity: 'number',
    volume24h: 'number',
    createdAt: 'date'
};

const Trade = {
    tokenMint: 'string',
    tokenSymbol: 'string',
    strategy: 'string',
    entryPrice: 'number',
    exitPrice: 'number',
    solIn: 'number',
    solOut: 'number',
    pnl: 'number',
    pnlPercent: 'number',
    buyTx: 'string',
    sellTx: 'string',
    entryReason: 'string',
    exitReason: 'string',
    marketCondition: 'string'
};

const Strategy = {
    name: 'string',
    description: 'string',
    parameters: 'object',
    'parameters.minLiquidity': 'number',
    'parameters.minVolume': 'number',
    'parameters.maxSlippage': 'number',
    'parameters.takeProfit': 'number',
    'parameters.stopLoss': 'number'
};

const TokenMetrics = {
    mint: 'string',
    symbol: 'string',
    totalTrades: 'number',
    winningTrades: 'number',
    totalPnL: 'number',
    avgPnL: 'number',
    bestTrade: 'number',
    worstTrade: 'number',
    lastTrade: 'date'
};

const StrategyMetrics = {
    strategy: 'string',
    totalTrades: 'number',
    winningTrades: 'number',
    totalPnL: 'number',
    avgPnL: 'number',
    bestTrade: 'number',
    worstTrade: 'number'
};

const MarketCondition = {
    trend: 'string',
    strength: 'number',
    volatility: 'number',
    sentiment: 'string'
};

const TradeSignal = {
    tokenMint: 'string',
    tokenSymbol: 'string',
    action: 'string',
    price: 'number',
    amount: 'number',
    reason: 'string',
    metrics: 'object',
    marketCondition: 'object'
};

module.exports = {
    Token,
    Trade,
    Strategy,
    TokenMetrics,
    StrategyMetrics,
    MarketCondition,
    TradeSignal,
    DEX_TYPES,
    WALLET_TYPES,
    MARKET_TYPES,
    RISK_TYPES,
    TRADING_TYPES
}; 