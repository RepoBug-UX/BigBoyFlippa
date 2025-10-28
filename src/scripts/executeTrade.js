const config = require('../core/config');
const logger = require('../core/utils/logger');
const tradeExecutor = require('../services/trading/tradeExecutor');
const walletManager = require('../services/wallet/walletManager');
const jupiterService = require('../services/dex/jupiterService');
const bs58 = require('bs58');

async function initializeWallet() {
    try {
        const privateKey = config.get('WALLET_PRIVATE_KEY');
        if (!privateKey) {
            throw new Error('WALLET_PRIVATE_KEY not found in config');
        }

        // Try to parse the private key in different formats
        let formattedKey;
        try {
            // Try parsing as base58
            formattedKey = bs58.decode(privateKey);
        } catch (e) {
            try {
                // Try parsing as base64
                formattedKey = Buffer.from(privateKey, 'base64');
            } catch (e2) {
                throw new Error('Invalid private key format. Must be base58 or base64 encoded');
            }
        }

        await walletManager.initialize(formattedKey);
        logger.info('Wallet initialized successfully');
        
        // Verify wallet balance
        const balance = await walletManager.getBalance();
        if (balance < 0.005) {
            throw new Error(`Insufficient wallet balance. Required: 0.005 SOL, Available: ${balance} SOL`);
        }
        logger.info(`Wallet balance: ${balance} SOL`);
        
        return balance;
    } catch (error) {
        logger.error('Failed to initialize wallet:', error.message);
        throw error;
    }
}

async function executeTrade() {
    try {
        logger.info('Starting trade execution...');

        // Initialize wallet first
        const balance = await initializeWallet();

        // Initialize Jupiter service
        logger.info('Initializing Jupiter service...');
        await jupiterService.initialize();
        logger.info('Jupiter service initialized');

        // Calculate trade amount (0.5% of balance)
        const tradeAmount = Math.min(balance * 0.005, 0.005);
        logger.info(`Using trade amount of ${tradeAmount} SOL (0.5% of balance)`);

        // Trade parameters for BONK
        const tradeParams = {
            tokenMint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
            tokenSymbol: 'BONK',
            amount: tradeAmount,
            strategy: 'meme_flip',
            entryReason: 'Testing real trade execution with BONK'
        };

        logger.info('Executing trade with parameters:', JSON.stringify(tradeParams, null, 2));

        // Execute the trade
        const result = await tradeExecutor.executeBuy(tradeParams);
        
        logger.info('Trade executed successfully:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        logger.error('Trade execution failed:', error.message);
        throw error;
    }
}

// Execute the trade
executeTrade().then(() => {
    logger.info('Trade execution completed');
    process.exit(0);
}).catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
}); 