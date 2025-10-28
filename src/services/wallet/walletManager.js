const { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } = require('@solana/web3.js');
const config = require('../../core/config');
const logger = require('../../core/utils/logger');
const fs = require('fs');
const path = require('path');

class WalletManager {
    constructor() {
        this.keypair = null;
        this.connection = null;
        this.initialized = false;
    }

    async initialize(privateKey) {
        try {
            logger.info('Starting wallet initialization');
            
            // Initialize keypair
            logger.info(`Initializing keypair with key of length: ${privateKey.length}`);
            this.keypair = Keypair.fromSecretKey(
                privateKey instanceof Buffer ? privateKey : Buffer.from(privateKey)
            );
            logger.info('Keypair created successfully');
            logger.info(`Public key: ${this.keypair.publicKey.toString()}`);

            // Initialize connection
            const rpcEndpoint = config.get('SOLANA_RPC_ENDPOINT');
            if (!rpcEndpoint) {
                throw new Error('SOLANA_RPC_ENDPOINT is required');
            }
            logger.info(`Connecting to RPC endpoint: ${rpcEndpoint}`);
            
            this.connection = new Connection(rpcEndpoint, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000
            });
            logger.info('RPC connection established');

            // Mark as initialized before balance check
            this.initialized = true;

            // Try to get balance but don't fail initialization if it fails
            try {
                const balance = await this.getBalance();
                logger.info(`Initial wallet balance: ${balance} SOL`);
            } catch (balanceError) {
                logger.warning(`Could not fetch initial balance: ${balanceError.message}`);
            }
            
            logger.info('Wallet initialization complete');
            return true;
        } catch (error) {
            logger.error('Failed to initialize wallet:', error.message);
            if (error.stack) {
                logger.error('Stack trace:', error.stack);
            }
            this.initialized = false;
            throw error;
        }
    }

    async getBalance() {
        if (!this.initialized) {
            throw new Error('Wallet not initialized');
        }

        try {
            const balance = await this.connection.getBalance(this.keypair.publicKey);
            return balance / LAMPORTS_PER_SOL;
        } catch (error) {
            logger.error('Failed to get wallet balance:', error.message);
            throw error;
        }
    }

    getPublicKey() {
        if (!this.initialized) {
            throw new Error('Wallet not initialized');
        }
        return this.keypair.publicKey;
    }

    signTransaction(transaction) {
        if (!this.initialized) {
            throw new Error('Wallet not initialized');
        }

        if (transaction instanceof VersionedTransaction) {
            transaction.sign([this.keypair]);
            return transaction;
        } else {
            return transaction.sign([this.keypair]);
        }
    }

    async sendTransaction(transaction) {
        if (!this.initialized) {
            throw new Error('Wallet not initialized');
        }

        try {
            const signedTx = this.signTransaction(transaction);
            
            logger.info('Sending transaction...');
            const signature = await this.connection.sendTransaction(signedTx, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 3
            });
            
            logger.info(`Transaction sent with signature: ${signature}`);
            
            const confirmation = await this.connection.confirmTransaction(signature, {
                commitment: 'confirmed',
                confirmTransactionInitialTimeout: 60000
            });
            
            if (confirmation.value.err) {
                throw new Error(`Transaction failed: ${confirmation.value.err}`);
            }
            
            logger.info('Transaction confirmed successfully');
            return signature;
        } catch (error) {
            logger.error('Failed to send transaction:', error.message);
            throw error;
        }
    }

    /**
     * Loads the wallet keypair from file
     * @private
     */
    _loadKeypair() {
        try {
            const keypairPath = path.join(config.get('DATA_DIR'), 'wallet.json');
            if (fs.existsSync(keypairPath)) {
                const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
                return Keypair.fromSecretKey(new Uint8Array(keypairData));
            }

            // Create new keypair if none exists
            const newKeypair = Keypair.generate();
            fs.writeFileSync(keypairPath, JSON.stringify(Array.from(newKeypair.secretKey)));
            return newKeypair;
        } catch (error) {
            logger.error('Failed to load wallet:', error.message);
            throw error;
        }
    }

    /**
     * Starts balance tracking
     * @private
     */
    async startBalanceTracking() {
        try {
            await this.updateBalance();
            setInterval(() => this.updateBalance(), 30000); // Update every 30 seconds
        } catch (error) {
            logger.error('Failed to start balance tracking:', error.message);
        }
    }

    /**
     * Updates wallet balance
     */
    async updateBalance() {
        try {
            const balance = await this.connection.getBalance(this.keypair.publicKey);
            logger.info(`Wallet balance updated: ${balance / LAMPORTS_PER_SOL} SOL`);
        } catch (error) {
            logger.error('Failed to update balance:', error.message);
        }
    }

    /**
     * Gets transaction details
     * @param {string} signature - Transaction signature
     * @returns {Promise<Object>} Transaction details
     */
    async getTransactionDetails(signature) {
        try {
            const transaction = await this.connection.getTransaction(signature, {
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed'
            });
            return transaction;
        } catch (error) {
            logger.error('Failed to get transaction details:', error.message);
            throw error;
        }
    }

    /**
     * Checks if wallet has sufficient balance
     * @param {number} amount - Amount in SOL
     * @returns {Promise<boolean>} True if sufficient balance
     */
    async hasSufficientBalance(amount) {
        try {
            const balance = await this.getBalance();
            const hasBalance = balance >= amount;
            if (!hasBalance) {
                logger.warning(`Insufficient balance. Required: ${amount} SOL, Available: ${balance} SOL`);
            }
            return hasBalance;
        } catch (error) {
            logger.error('Failed to check balance:', error.message);
            return false;
        }
    }

    /**
     * Estimates transaction fee
     * @param {Transaction} transaction - Transaction to estimate
     * @returns {Promise<number>} Fee in SOL
     */
    async estimateFee(transaction) {
        try {
            if (transaction instanceof VersionedTransaction) {
                const simulation = await this.connection.simulateTransaction(transaction);
                return simulation.value.unitsConsumed * 0.000001; // Convert to SOL
            } else {
                const fee = await this.connection.getFeeForMessage(transaction.compileMessage());
                return fee / LAMPORTS_PER_SOL;
            }
        } catch (error) {
            logger.error('Failed to estimate fee:', error.message);
            throw error;
        }
    }

    /**
     * Airdrops SOL (for testing only)
     * @param {number} amount - Amount in SOL
     * @returns {Promise<string>} Transaction ID
     */
    async requestAirdrop(amount) {
        try {
            const signature = await this.connection.requestAirdrop(
                this.keypair.publicKey,
                amount * LAMPORTS_PER_SOL
            );
            await this.connection.confirmTransaction(signature);
            await this.updateBalance();
            return signature;
        } catch (error) {
            logger.error('Failed to request airdrop:', error.message);
            throw error;
        }
    }
}

module.exports = new WalletManager(); 