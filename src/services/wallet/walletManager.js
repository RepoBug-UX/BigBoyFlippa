const { Keypair, Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
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
            // Initialize keypair
            this.keypair = Keypair.fromSecretKey(
                Buffer.from(privateKey, 'base64')
            );

            // Initialize connection
            const rpcEndpoint = config.get('SOLANA_RPC_ENDPOINT');
            if (!rpcEndpoint) {
                throw new Error('SOLANA_RPC_ENDPOINT is required');
            }
            this.connection = new Connection(rpcEndpoint, 'confirmed');

            // Verify connection and balance
            await this.getBalance();
            this.initialized = true;
            logger.info('Wallet initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize wallet:', error.message);
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
        return transaction.sign([this.keypair]);
    }

    async sendTransaction(transaction) {
        if (!this.initialized) {
            throw new Error('Wallet not initialized');
        }

        try {
            const signedTx = this.signTransaction(transaction);
            const signature = await this.connection.sendRawTransaction(signedTx.serialize());
            await this.connection.confirmTransaction(signature);
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
                maxSupportedTransactionVersion: 0
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
     * @returns {boolean} True if sufficient balance
     */
    hasSufficientBalance(amount) {
        return this.getBalance() >= amount;
    }

    /**
     * Estimates transaction fee
     * @param {Transaction} transaction - Transaction to estimate
     * @returns {Promise<number>} Fee in SOL
     */
    async estimateFee(transaction) {
        try {
            const fee = await this.connection.getFeeForMessage(transaction.compileMessage());
            return fee / LAMPORTS_PER_SOL;
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