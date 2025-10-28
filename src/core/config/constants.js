const path = require('path');

module.exports = {
    // API Endpoints
    JUPITER_API: 'https://quote-api.jup.ag/v6',
    HELIUS_API: 'https://api.helius.xyz/v0',
    
    // File Paths
    DATA_DIR: path.join(__dirname, '../../data'),
    LOGS_DIR: path.join(__dirname, '../../data/logs'),
    
    // Trading Constants
    MIN_LIQUIDITY: 10, // SOL (reduced from 1000 for meme coins)
    MIN_VOLUME: 50, // SOL (reduced from 500 for meme coins)
    MAX_SLIPPAGE: 2.0, // % (increased from 1.0 for meme coins)
    DEFAULT_TAKE_PROFIT: 5.0, // %
    DEFAULT_STOP_LOSS: 3.0, // %
    
    // Risk Management
    MAX_POSITION_SIZE: 1.0, // SOL
    MAX_RISK_PER_TRADE: 0.1, // 10%
    MAX_DRAWDOWN: 0.2, // 20%
    
    // Monitoring
    METRICS_UPDATE_INTERVAL: 60000, // 1 minute
    TOKEN_CHECK_INTERVAL: 300000, // 5 minutes
    
    // Notification
    TELEGRAM_ALERT_TYPES: {
        INFO: 'info',
        TRADE: 'trade',
        ERROR: 'error',
        BALANCE: 'balance'
    },
    
    // Strategy Types
    STRATEGY_TYPES: {
        DEFAULT: 'default',
        AGGRESSIVE: 'aggressive',
        CONSERVATIVE: 'conservative'
    },
    
    // File Names
    TRADE_LOG_FILE: 'trade_log.csv',
    TOKEN_METRICS_FILE: 'token_metrics.json',
    STRATEGY_PERFORMANCE_FILE: 'strategy_performance.json',
    TOKEN_PERFORMANCE_FILE: 'token_performance.json',
    
    // DEX Configuration
    DEX_CONFIG: {
        SOLANA_RPC_ENDPOINT: 'SOLANA_RPC_ENDPOINT',
        JUPITER_API_ENDPOINT: 'JUPITER_API_ENDPOINT',
        JUPITER_API_KEY: 'JUPITER_API_KEY',
        MAX_SLIPPAGE: 'MAX_SLIPPAGE',
        MIN_LIQUIDITY: 'MIN_LIQUIDITY'
    },
    
    // Wallet Configuration
    WALLET_CONFIG: {
        WALLET_FILE: 'wallet.json',
        MIN_BALANCE: 'MIN_BALANCE',
        GAS_FEE_BUFFER: 'GAS_FEE_BUFFER'
    },
    
    // Market Configuration
    MARKET_CONFIG: {
        MARKET_UPDATE_INTERVAL: 'MARKET_UPDATE_INTERVAL',
        PRICE_HISTORY_LENGTH: 'PRICE_HISTORY_LENGTH',
        VOLUME_HISTORY_LENGTH: 'VOLUME_HISTORY_LENGTH',
        LIQUIDITY_HISTORY_LENGTH: 'LIQUIDITY_HISTORY_LENGTH',
        MAX_PRICE_IMPACT: 'MAX_PRICE_IMPACT'
    },
    
    // Risk Configuration
    RISK_CONFIG: {
        MAX_POSITION_SIZE: 'MAX_POSITION_SIZE',
        MAX_DAILY_LOSS: 'MAX_DAILY_LOSS',
        STOP_LOSS: 'STOP_LOSS',
        TAKE_PROFIT: 'TAKE_PROFIT',
        MAX_OPEN_TRADES: 'MAX_OPEN_TRADES',
        MAX_LEVERAGE: 'MAX_LEVERAGE',
        MIN_RISK_REWARD: 'MIN_RISK_REWARD'
    },
    
    // Trading Configuration
    TRADING_CONFIG: {
        MAX_CONCURRENT_TRADES: 'MAX_CONCURRENT_TRADES',
        MIN_TRADE_SIZE: 'MIN_TRADE_SIZE',
        MAX_TRADE_SIZE: 'MAX_TRADE_SIZE',
        TRADE_COOLDOWN: 'TRADE_COOLDOWN'
    }
}; 