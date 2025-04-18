require('dotenv').config();
const config = require('../core/config');
const logger = require('../core/utils/logger');
const walletManager = require('../services/wallet/walletManager');

async function verifyWallet() {
    try {
        logger.info('Starting wallet verification...');
        
        // Get private key from config
        const privateKey = config.get('WALLET_PRIVATE_KEY');
        if (!privateKey) {
            throw new Error('WALLET_PRIVATE_KEY is required in .env');
        }

        // Initialize wallet
        logger.info('Initializing wallet...');
        await walletManager.initialize(privateKey);

        // Get wallet details
        const publicKey = walletManager.getPublicKey();
        const balance = await walletManager.getBalance();

        logger.info('Wallet verification successful!');
        logger.info(`Public Key: ${publicKey.toString()}`);
        logger.info(`Balance: ${balance} SOL`);

        return true;
    } catch (error) {
        logger.error('Wallet verification failed:', error.message);
        return false;
    }
}

// Run verification
verifyWallet().then(success => {
    process.exit(success ? 0 : 1);
}); 