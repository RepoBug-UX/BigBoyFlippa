const config = require('../core/config');
const logger = require('../core/utils/logger');
const tradeExecutor = require('../services/trading/tradeExecutor');
const smartFilter = require('../features/filtering/smartFilter');
const alertSystem = require('../features/notification/alertSystem');
const walletManager = require('../services/wallet/walletManager');
const bs58 = require('bs58');
const axios = require('axios');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
    } catch (error) {
        logger.error('Failed to initialize wallet:', error.message);
        throw error;
    }
}

async function executeSingleTrade() {
    try {
        logger.info('Initializing single trade execution...');

        // Initialize wallet first
        await initializeWallet();

        // Get tokens from Jupiter API
        const response = await axios.get('https://token.jup.ag/all');
        const tokens = Object.values(response.data);
        
        if (!tokens || tokens.length === 0) {
            logger.info('No tokens found to trade');
            return;
        }

        // Filter and sort tokens by volume
        const filteredTokens = tokens
            .filter(token => {
                // Skip stablecoins and wrapped tokens
                const symbol = token.symbol.toLowerCase();
                return !symbol.includes('usd') && 
                       !symbol.includes('wrapped') &&
                       !symbol.startsWith('w') &&
                       token.address !== 'So11111111111111111111111111111111111111112'; // Skip SOL
            })
            .sort((a, b) => (b.volume24h || 0) - (a.volume24h || 0)); // Sort by 24h volume

        // Take top 20 tokens
        const maxTokensToCheck = 20;
        const tokensToCheck = filteredTokens.slice(0, maxTokensToCheck);
        
        logger.info(`Checking ${tokensToCheck.length} tokens for trading opportunities...`);
        logger.info('Selected tokens:', tokensToCheck.map(t => t.symbol).join(', '));

        // Take the first token that passes our filters
        for (const token of tokensToCheck) {
            try {
                // Add delay between requests to avoid rate limiting
                await sleep(1000); // 1 second delay between tokens

                // Get token data from Jupiter API
                const quoteResponse = await axios.get('https://quote-api.jup.ag/v6/quote', {
                    params: {
                        inputMint: 'So11111111111111111111111111111111111111112', // SOL
                        outputMint: token.address,
                        amount: '5000000', // 0.005 SOL in lamports
                        slippageBps: 50
                    }
                });

                const quote = quoteResponse.data;
                if (!quote || !quote.outAmount) {
                    logger.info(`No quote available for ${token.symbol}`);
                    continue;
                }

                // Calculate liquidity from quote
                const liquidity = quote.outAmount / 1000000000; // Convert to SOL
                const minLiquidity = config.get('MIN_LIQUIDITY', 5); // Use 5 SOL minimum
                logger.info(`Checking ${token.symbol} liquidity: ${liquidity} SOL (min required: ${minLiquidity} SOL)`);
                
                if (liquidity < minLiquidity) {
                    logger.info(`Token ${token.symbol} does not meet minimum liquidity requirement. Current: ${liquidity} SOL`);
                    continue;
                }

                // Get market metrics from quote
                const metrics = {
                    liquidity,
                    priceImpact: quote.priceImpactPct || 0,
                    volume24h: token.volume24h || 0,
                    price: quote.outAmount / 1e9 // Price in SOL
                };

                // Skip if price impact is too high
                if (metrics.priceImpact > 2.0) { // 2% max price impact
                    logger.info(`Token ${token.symbol} has too high price impact: ${metrics.priceImpact}%`);
                    continue;
                }

                // Use fixed trade amount
                const tradeAmount = 0.005; // Fixed at 0.005 SOL
                
                logger.info(`Using trade amount of ${tradeAmount.toFixed(6)} SOL for ${token.symbol} (Price Impact: ${metrics.priceImpact}%)`);

                // Execute trade
                const result = await tradeExecutor.executeBuy({
                    tokenMint: token.address,
                    tokenSymbol: token.symbol,
                    strategy: 'meme_flip',
                    amount: tradeAmount,
                    entryReason: `Token meets requirements - Liquidity: ${liquidity} SOL, Price Impact: ${metrics.priceImpact}%`
                });

                if (result.success) {
                    logger.info(`Successfully entered trade for ${token.symbol}`);
                    logger.info('Trade details:', JSON.stringify(result.tradeInfo, null, 2));
                    
                    // Monitor the trade until it closes
                    logger.info('Monitoring trade...');
                    const maxMonitorTime = 300000; // 5 minutes max monitoring time
                    const startTime = Date.now();
                    
                    while (tradeExecutor.hasActiveTrade(token.address)) {
                        if (Date.now() - startTime > maxMonitorTime) {
                            logger.warning('Maximum monitoring time reached. Exiting...');
                            break;
                        }
                        await sleep(5000); // Check every 5 seconds
                    }
                    
                    logger.info('Trade monitoring completed');
                    return;
                } else {
                    logger.warning(`Failed to enter trade for ${token.symbol}: ${result.error}`);
                }
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    logger.warning('Rate limit reached. Waiting before continuing...');
                    await sleep(5000); // Wait 5 seconds on rate limit
                    continue;
                }
                logger.error(`Error processing token ${token.symbol}:`, error.message);
            }
        }

        logger.info('No suitable tokens found for trading after checking', maxTokensToCheck, 'tokens');

    } catch (error) {
        logger.error('Error executing single trade:', error.message);
        await alertSystem.sendErrorAlert(error, 'Single Trade Execution');
    }
}

// Execute the trade
executeSingleTrade().then(() => {
    logger.info('Single trade execution completed');
    process.exit(0);
}).catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
}); 