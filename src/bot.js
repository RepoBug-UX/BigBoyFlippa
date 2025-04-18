require('dotenv').config();
const config = require('./core/config');
const logger = require('./core/utils/logger');
const tradeExecutor = require('./services/trading/tradeExecutor');
const tokenMonitor = require('./features/monitoring/tokenMonitor');
const smartFilter = require('./features/filtering/smartFilter');
const alertSystem = require('./features/notification/alertSystem');
const walletManager = require('./services/wallet/walletManager');
const jupiterService = require('./services/jupiter/jupiterService');
const path = require('path');
const fs = require('fs');

class MemeBot {
    constructor() {
        this.validateConfig();
        this.checkInterval = config.get('CHECK_INTERVAL_MS', 30000);
        this.tradeAmount = config.get('TRADE_AMOUNT_SOL', 0.01);
        this.running = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        this.retryDelay = 5000;
        this.noOpportunityCount = 0;
        this.maxNoOpportunityCount = config.get('MAX_NO_OPPORTUNITY_COUNT', 10);
        this.waitPeriod = config.get('WAIT_PERIOD_MS', 300000);
        this.lastTradeTime = 0;
        this.minTimeBetweenTrades = config.get('MIN_TIME_BETWEEN_TRADES_MS', 3600000);
        this.minSafetyScore = config.get('MIN_SAFETY_SCORE', 0.7);
        this.healthCheckInterval = config.get('HEALTH_CHECK_INTERVAL_MS', 60000);
        this.lastHealthCheck = 0;
        this.healthStatus = {
            wallet: false,
            jupiter: false,
            helius: false,
            lastCheck: 0
        };
    }

    validateConfig() {
        const requiredConfigs = [
            'HELIUS_API_KEY',
            'SOLANA_RPC_ENDPOINT',
            'WALLET_PRIVATE_KEY',
            'MAX_POSITION_SIZE',
            'MAX_DAILY_LOSS',
            'MAX_LOSS_PERCENT',
            'MIN_PROFIT_PERCENT',
            'MAX_CONCURRENT_TRADES',
            'MIN_LIQUIDITY',
            'MAX_SLIPPAGE',
            'MAX_HOLD_TIME_MS',
            'ENABLE_AUTO_TRADE'
        ];

        const missingConfigs = requiredConfigs.filter(key => !config.get(key));
        if (missingConfigs.length > 0) {
            throw new Error(`Missing required configurations: ${missingConfigs.join(', ')}`);
        }
    }

    async initialize() {
        try {
            logger.info('Initializing Meme Bot...');

            // Create required directories
            await this._createDirectories();

            // Initialize wallet
            await this._initializeWallet();

            // Initialize API clients
            await this._initializeApiClients();

            // Verify connections
            await this._verifyConnections();

            // Initialize data files
            await this._initializeDataFiles();

            logger.info('Meme Bot initialization complete');
        } catch (error) {
            logger.error('Failed to initialize bot:', error.message);
            await alertSystem.sendErrorAlert(error, 'Bot Initialization');
            throw error;
        }
    }

    async _createDirectories() {
        const directories = [
            path.join(process.cwd(), 'src/data'),
            path.join(process.cwd(), 'src/data/logs'),
            path.join(process.cwd(), 'src/data/trades'),
            path.join(process.cwd(), 'src/data/metrics'),
            path.join(process.cwd(), 'src/data/strategies')
        ];

        for (const dir of directories) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                logger.info(`Created directory: ${dir}`);
            }
        }
    }

    async _initializeWallet() {
        const privateKey = config.get('WALLET_PRIVATE_KEY');
        if (!privateKey) {
            throw new Error('WALLET_PRIVATE_KEY is required');
        }

        try {
            await walletManager.initialize(privateKey);
            const balance = await walletManager.getBalance();
            logger.info(`Wallet initialized. Current balance: ${balance} SOL`);

            if (balance < this.tradeAmount) {
                throw new Error(`Insufficient wallet balance. Required: ${this.tradeAmount} SOL, Available: ${balance} SOL`);
            }
        } catch (error) {
            logger.error('Failed to initialize wallet:', error.message);
            throw error;
        }
    }

    async _initializeApiClients() {
        try {
            // Initialize Jupiter API (API key is optional)
            const jupiterApiKey = config.get('JUPITER_API_KEY');
            await jupiterService.initialize(jupiterApiKey);

            // Initialize Helius API
            const heliusApiKey = config.get('HELIUS_API_KEY');
            if (!heliusApiKey) {
                throw new Error('HELIUS_API_KEY is required');
            }
            await tokenMonitor.initialize(heliusApiKey);

            logger.info('API clients initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize API clients:', error.message);
            throw error;
        }
    }

    async _verifyConnections() {
        try {
            // Verify Jupiter API connection
            const jupiterStatus = await jupiterService.verifyConnection();
            if (!jupiterStatus.connected) {
                throw new Error('Failed to connect to Jupiter API');
            }

            // Verify Helius API connection
            const heliusStatus = await tokenMonitor.verifyConnection();
            if (!heliusStatus.connected) {
                throw new Error('Failed to connect to Helius API');
            }

            logger.info('All API connections verified');
        } catch (error) {
            logger.error('Connection verification failed:', error.message);
            throw error;
        }
    }

    async _initializeDataFiles() {
        const files = [
            {
                path: path.join(process.cwd(), 'src/data/trades/trade_log.csv'),
                content: 'timestamp,token_mint,token_symbol,strategy,entry_price,exit_price,sol_in,sol_out,pnl,pnl_percent,buy_tx,sell_tx,liquidity,volume_24h,entry_reason,exit_reason,market_condition\n'
            },
            {
                path: path.join(process.cwd(), 'src/data/metrics/token_metrics.json'),
                content: '{}'
            },
            {
                path: path.join(process.cwd(), 'src/data/strategies/strategy_performance.json'),
                content: '{}'
            }
        ];

        for (const file of files) {
            if (!fs.existsSync(file.path)) {
                fs.writeFileSync(file.path, file.content);
                logger.info(`Created file: ${file.path}`);
            }
        }
    }

    async start() {
        try {
            this.running = true;
            logger.info('Starting Meme Bot...');
            await alertSystem.sendInfoAlert('Meme Bot started');

            // Start health check
            this.startHealthCheck();

            // Start the main loop
            this.mainLoop();
        } catch (error) {
            logger.error('Failed to start bot:', error.message);
            await alertSystem.sendErrorAlert(error, 'Bot Startup');
            process.exit(1);
        }
    }

    async startHealthCheck() {
        setInterval(async () => {
            try {
                await this.performHealthCheck();
            } catch (error) {
                logger.error('Health check failed:', error.message);
            }
        }, this.healthCheckInterval);
    }

    async performHealthCheck() {
        const currentTime = Date.now();
        this.lastHealthCheck = currentTime;

        // Check wallet
        try {
            const balance = await walletManager.getBalance();
            this.healthStatus.wallet = balance >= this.tradeAmount;
            if (!this.healthStatus.wallet) {
                logger.warn('Wallet health check failed: Insufficient balance');
            }
        } catch (error) {
            this.healthStatus.wallet = false;
            logger.error('Wallet health check failed:', error.message);
        }

        // Check Jupiter API
        try {
            const jupiterStatus = await jupiterService.verifyConnection();
            this.healthStatus.jupiter = jupiterStatus.connected;
            if (!this.healthStatus.jupiter) {
                logger.warn('Jupiter API health check failed');
            }
        } catch (error) {
            this.healthStatus.jupiter = false;
            logger.error('Jupiter API health check failed:', error.message);
        }

        // Check Helius API
        try {
            const heliusStatus = await tokenMonitor.verifyConnection();
            this.healthStatus.helius = heliusStatus.connected;
            if (!this.healthStatus.helius) {
                logger.warn('Helius API health check failed');
            }
        } catch (error) {
            this.healthStatus.helius = false;
            logger.error('Helius API health check failed:', error.message);
        }

        // Send alert if any component is unhealthy
        if (!this.healthStatus.wallet || !this.healthStatus.jupiter || !this.healthStatus.helius) {
            await alertSystem.sendErrorAlert(
                new Error('Bot health check failed'),
                'Health Check',
                {
                    wallet: this.healthStatus.wallet,
                    jupiter: this.healthStatus.jupiter,
                    helius: this.healthStatus.helius
                }
            );
        }
    }

    stop() {
        this.running = false;
        logger.info('Stopping Meme Bot...');
        clearInterval(this.healthCheckInterval);
    }

    async mainLoop() {
        while (this.running) {
            try {
                // Reset retry count on successful iteration
                this.retryCount = 0;

                // Check if we need to wait
                const currentTime = Date.now();
                if (this.noOpportunityCount >= this.maxNoOpportunityCount) {
                    const waitTime = this.waitPeriod - (currentTime - this.lastTradeTime);
                    if (waitTime > 0) {
                        logger.info(`No good opportunities found in ${this.maxNoOpportunityCount} checks. Waiting ${Math.ceil(waitTime/1000)} seconds...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        this.noOpportunityCount = 0;
                        continue;
                    }
                }

                // Get new tokens from monitoring
                const newTokens = await tokenMonitor.getNewTokens();
                let foundOpportunity = false;
                
                for (const token of newTokens) {
                    // Check if we can take more trades
                    if (tradeExecutor.hasActiveTrade(token.mint)) {
                        continue;
                    }

                    // Check minimum time between trades
                    if (currentTime - this.lastTradeTime < this.minTimeBetweenTrades) {
                        logger.info(`Waiting for minimum time between trades. Next trade available in ${Math.ceil((this.minTimeBetweenTrades - (currentTime - this.lastTradeTime))/1000)} seconds`);
                        break;
                    }

                    // Evaluate token safety
                    const safetyScore = await smartFilter.evaluateToken(token.mint);
                    if (!safetyScore || safetyScore < this.minSafetyScore) {
                        logger.info(`Token ${token.mint} did not meet safety criteria. Score: ${safetyScore} (Min: ${this.minSafetyScore})`);
                        continue;
                    }

                    // Execute trade
                    const result = await tradeExecutor.executeBuy({
                        tokenMint: token.mint,
                        tokenSymbol: token.symbol,
                        strategy: 'meme_flip',
                        amount: this.tradeAmount,
                        entryReason: `New meme token detected with safety score: ${safetyScore}`
                    });

                    if (result.success) {
                        logger.info(`Successfully entered trade for ${token.symbol}`);
                        this.lastTradeTime = currentTime;
                        this.noOpportunityCount = 0;
                        foundOpportunity = true;
                    } else {
                        logger.warning(`Failed to enter trade for ${token.symbol}: ${result.error}`);
                    }
                }

                // Update no opportunity count
                if (!foundOpportunity) {
                    this.noOpportunityCount++;
                    logger.info(`No trading opportunities found. Count: ${this.noOpportunityCount}/${this.maxNoOpportunityCount}`);
                }

                // Wait for next check
                await new Promise(resolve => setTimeout(resolve, this.checkInterval));
            } catch (error) {
                logger.error('Error in main loop:', error.message);
                await alertSystem.sendErrorAlert(error, 'Main Loop');
                
                // Implement exponential backoff
                this.retryCount++;
                if (this.retryCount >= this.maxRetries) {
                    logger.error('Max retries reached. Stopping bot...');
                    await alertSystem.sendErrorAlert(new Error('Max retries reached'), 'Main Loop');
                    this.stop();
                    process.exit(1);
                }
                
                const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
                logger.info(`Retrying in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}

// Handle process termination
process.on('SIGINT', async () => {
    logger.info('Received SIGINT. Stopping bot...');
    await alertSystem.sendInfoAlert('Bot stopping due to SIGINT');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM. Stopping bot...');
    await alertSystem.sendInfoAlert('Bot stopping due to SIGTERM');
    process.exit(0);
});

// Start the bot
const bot = new MemeBot();
bot.initialize().then(() => bot.start()).catch(error => {
    logger.error('Fatal error:', error.message);
    process.exit(1);
});
