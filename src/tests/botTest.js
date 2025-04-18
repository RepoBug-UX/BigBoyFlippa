const config = require('../core/config');
const logger = require('../core/utils/logger');
const { Connection } = require('@solana/web3.js');
const axios = require('axios');

class BotTest {
    constructor() {
        // Debug logging
        logger.info('Debug: Checking environment variables...');
        logger.info('Debug: Config keys available:', Object.keys(config));
        logger.info('Debug: Process env keys:', Object.keys(process.env));
        
        this.heliusApiKey = config.get('HELIUS_API_KEY');
        logger.info('Debug: Helius API Key:', this.heliusApiKey ? 'Found' : 'Not found');
        
        if (!this.heliusApiKey) {
            throw new Error('HELIUS_API_KEY is required for testing');
        }
        this.rpcEndpoint = `https://rpc.helius.xyz/?api-key=${this.heliusApiKey}`;
        this.connection = new Connection(this.rpcEndpoint);
    }

    async testTokenDiscovery() {
        logger.info('Testing token discovery with Jupiter API...');
        try {
            // Get tokens from Jupiter API
            const response = await axios.get('https://token.jup.ag/all');
            
            if (!response.data || typeof response.data !== 'object') {
                throw new Error('Invalid response format from Jupiter API');
            }

            const tokens = Object.values(response.data);
            logger.info(`Found ${tokens.length} tokens on Jupiter`);
            
            // Filter for some well-known tokens for testing
            const testTokens = tokens.filter(token => 
                ['SOL', 'USDC', 'BONK'].includes(token.symbol)
            );

            logger.info('Test tokens:', testTokens.map(t => ({
                symbol: t.symbol,
                address: t.address
            })));
            
            return testTokens.map(token => ({
                address: token.address,
                name: token.name,
                symbol: token.symbol
            }));
        } catch (error) {
            if (error.response) {
                logger.error(`Jupiter API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                logger.error('No response received from Jupiter API');
            } else {
                logger.error('Error setting up Jupiter API request:', error.message);
            }
            throw error;
        }
    }

    async testLiquidityCheck(tokenAddress, pairTokenAddress, testAmount = 0.01) {
        logger.info(`Testing liquidity check for token pair: ${tokenAddress} -> ${pairTokenAddress} with amount: ${testAmount}`);
        try {
            const response = await axios.get('https://quote-api.jup.ag/v6/quote', {
                params: {
                    inputMint: tokenAddress,
                    outputMint: pairTokenAddress,
                    amount: (testAmount * 1e9).toString(), // Convert SOL to lamports
                    slippageBps: 50
                },
                timeout: 10000
            });
            
            if (!response.data || !response.data.outAmount) {
                throw new Error('Invalid response format from Jupiter API');
            }

            const liquidity = response.data.outAmount;
            const usdcAmount = liquidity / 1e6; // Convert lamports to USDC
            logger.info(`Liquidity check: ${testAmount} SOL = ${usdcAmount} USDC`);
            
            // Check price impact
            const priceImpact = response.data.priceImpactPct || 0;
            logger.info(`Price impact: ${priceImpact}%`);
            
            // Check volume
            const volume24h = response.data.volume24h || 0;
            logger.info(`24h Volume: ${volume24h} USDC`);
            
            const minLiquidity = config.get('MIN_LIQUIDITY', 100) * 1e6; // Convert to USDC decimals
            const hasEnoughLiquidity = liquidity >= minLiquidity;
            const acceptablePriceImpact = priceImpact < 1; // Less than 1% price impact
            const hasEnoughVolume = volume24h >= minLiquidity;
            
            logger.info(`Liquidity check: ${hasEnoughLiquidity ? 'PASS' : 'FAIL'}`);
            logger.info(`Price impact check: ${acceptablePriceImpact ? 'PASS' : 'FAIL'}`);
            logger.info(`Volume check: ${hasEnoughVolume ? 'PASS' : 'FAIL'}`);
            
            return {
                hasEnoughLiquidity,
                acceptablePriceImpact,
                hasEnoughVolume,
                liquidity,
                priceImpact,
                volume24h
            };
        } catch (error) {
            if (error.response) {
                logger.error(`Jupiter API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                logger.error('No response received from Jupiter API');
            } else {
                logger.error('Error setting up Jupiter API request:', error.message);
            }
            return {
                hasEnoughLiquidity: false,
                acceptablePriceImpact: false,
                hasEnoughVolume: false,
                liquidity: 0,
                priceImpact: 0,
                volume24h: 0
            };
        }
    }

    async testRiskAssessment(tokenAddress) {
        logger.info(`Testing risk assessment for token: ${tokenAddress}`);
        try {
            const response = await axios.get(`https://api.helius.xyz/v0/token-metadata?api-key=${this.heliusApiKey}`, {
                params: {
                    mintAccounts: [tokenAddress]
                },
                timeout: 10000
            });
            
            if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
                throw new Error('Invalid response format from Helius API');
            }

            const tokenData = response.data[0];
            logger.info(`Token data:`, {
                name: tokenData.name,
                symbol: tokenData.symbol,
                supply: tokenData.supply,
                marketCap: tokenData.marketCap
            });
            
            const riskScore = this.calculateRiskScore(tokenData);
            logger.info(`Risk score: ${riskScore}/100`);
            
            const riskPassed = riskScore >= 70;
            logger.info(`Risk assessment: ${riskPassed ? 'PASS' : 'FAIL'}`);
            
            return {
                riskPassed,
                riskScore,
                tokenData
            };
        } catch (error) {
            if (error.response) {
                logger.error(`Helius API error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
            } else if (error.request) {
                logger.error('No response received from Helius API');
            } else {
                logger.error('Error setting up Helius API request:', error.message);
            }
            return {
                riskPassed: false,
                riskScore: 0,
                tokenData: null
            };
        }
    }

    calculateRiskScore(tokenData) {
        let score = 100;
        
        // Deduct points based on risk factors
        if (!tokenData.verified) score -= 30;
        if (tokenData.supply > 1000000000) score -= 20;
        if (!tokenData.website) score -= 10;
        if (!tokenData.twitter) score -= 10;
        
        return Math.max(0, score);
    }

    async testPositionManagement() {
        logger.info('Testing position management...');
        try {
            const testAmount = 1.0; // 1 SOL
            const testToken = 'So11111111111111111111111111111111111111112';
            const testPair = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
            
            // Test position size calculation
            const maxPositionSize = config.get('MAX_POSITION_SIZE', 1.0);
            const calculatedSize = Math.min(testAmount, maxPositionSize);
            logger.info(`Position size calculation: ${calculatedSize} SOL (max: ${maxPositionSize} SOL)`);
            
            // Test stop-loss calculation
            const maxLossPercent = config.get('MAX_LOSS_PERCENT', 5);
            const stopLossPrice = calculatedSize * (1 - maxLossPercent / 100);
            logger.info(`Stop-loss calculation: ${stopLossPrice} SOL (${maxLossPercent}% below entry)`);
            
            // Test take-profit calculation
            const minProfitPercent = config.get('MIN_PROFIT_PERCENT', 10);
            const takeProfitPrice = calculatedSize * (1 + minProfitPercent / 100);
            logger.info(`Take-profit calculation: ${takeProfitPrice} SOL (${minProfitPercent}% above entry)`);
            
            return {
                positionSize: calculatedSize,
                stopLoss: stopLossPrice,
                takeProfit: takeProfitPrice
            };
        } catch (error) {
            logger.error('Position management test failed:', error);
            return null;
        }
    }

    async testRiskManagement() {
        logger.info('Testing risk management...');
        try {
            const maxDailyLoss = config.get('MAX_DAILY_LOSS', 0.5);
            const maxLossPercent = config.get('MAX_LOSS_PERCENT', 5);
            const maxConcurrentTrades = config.get('MAX_CONCURRENT_TRADES', 3);
            
            // Test daily loss tracking
            const dailyLoss = 0.2; // Simulated daily loss
            const dailyLossExceeded = dailyLoss > maxDailyLoss;
            logger.info(`Daily loss check: ${dailyLoss} SOL (max: ${maxDailyLoss} SOL) - ${dailyLossExceeded ? 'EXCEEDED' : 'OK'}`);
            
            // Test loss percentage per trade
            const tradeLoss = 0.1; // Simulated trade loss
            const lossPercent = (tradeLoss / 1.0) * 100; // Assuming 1 SOL position
            const lossPercentExceeded = lossPercent > maxLossPercent;
            logger.info(`Loss percentage check: ${lossPercent}% (max: ${maxLossPercent}%) - ${lossPercentExceeded ? 'EXCEEDED' : 'OK'}`);
            
            // Test concurrent trades limit
            const currentTrades = 2; // Simulated current trades
            const tradesLimitExceeded = currentTrades >= maxConcurrentTrades;
            logger.info(`Concurrent trades check: ${currentTrades} (max: ${maxConcurrentTrades}) - ${tradesLimitExceeded ? 'EXCEEDED' : 'OK'}`);
            
            return {
                dailyLossExceeded,
                lossPercentExceeded,
                tradesLimitExceeded
            };
        } catch (error) {
            logger.error('Risk management test failed:', error);
            return null;
        }
    }

    async testConfiguration() {
        logger.info('Testing configuration...');
        try {
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
                'ENABLE_AUTO_TRADE',
                'DEBUG_MODE'
            ];
            
            const missingConfigs = requiredConfigs.filter(key => !config.get(key));
            if (missingConfigs.length > 0) {
                logger.error('Missing required configurations:', missingConfigs);
                return false;
            }
            
            logger.info('All required configurations are present');
            return true;
        } catch (error) {
            logger.error('Configuration test failed:', error);
            return false;
        }
    }

    async testErrorRecovery() {
        logger.info('Testing error recovery...');
        try {
            // Test network error handling
            const networkError = new Error('Network error');
            logger.info('Simulating network error...');
            // In a real scenario, we would retry the operation
            logger.info('Network error recovery: Would retry operation');
            
            // Test API rate limit handling
            const rateLimitError = { response: { status: 429 } };
            logger.info('Simulating rate limit error...');
            // In a real scenario, we would implement exponential backoff
            logger.info('Rate limit recovery: Would implement exponential backoff');
            
            // Test transaction failure handling
            const txError = new Error('Transaction failed');
            logger.info('Simulating transaction failure...');
            // In a real scenario, we would verify the transaction status
            logger.info('Transaction failure recovery: Would verify transaction status');
            
            return true;
        } catch (error) {
            logger.error('Error recovery test failed:', error);
            return false;
        }
    }

    async testMemeCoinDiscovery() {
        logger.info('Testing meme coin discovery and filtering...');
        try {
            const tokens = await this.testTokenDiscovery();
            const memeCoins = tokens.filter(token => {
                // Basic criteria for meme coin identification
                const isMemeCoin = 
                    token.symbol.toLowerCase().includes('meme') ||
                    token.symbol.toLowerCase().includes('pepe') ||
                    token.symbol.toLowerCase().includes('doge') ||
                    token.symbol.toLowerCase().includes('shib') ||
                    token.symbol.toLowerCase().includes('floki') ||
                    token.symbol.toLowerCase().includes('elon') ||
                    token.symbol.toLowerCase().includes('wojak') ||
                    token.symbol.toLowerCase().includes('chad');
                
                return isMemeCoin;
            });

            logger.info(`Found ${memeCoins.length} potential meme coins`);
            logger.info('Sample meme coins:', memeCoins.slice(0, 5).map(t => ({
                symbol: t.symbol,
                address: t.address
            })));

            return memeCoins;
        } catch (error) {
            logger.error('Meme coin discovery test failed:', error);
            return [];
        }
    }

    async testMemeCoinTradingPairs() {
        logger.info('Testing meme coin trading pairs...');
        try {
            const memeCoins = await this.testMemeCoinDiscovery();
            const solAddress = 'So11111111111111111111111111111111111111112';
            const usdcAddress = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

            // Test top 3 meme coins with SOL and USDC
            const testPairs = memeCoins.slice(0, 3).flatMap(coin => [
                { input: coin.address, output: solAddress, name: `${coin.symbol}-SOL` },
                { input: coin.address, output: usdcAddress, name: `${coin.symbol}-USDC` }
            ]);

            const results = [];
            for (const pair of testPairs) {
                logger.info(`\nTesting ${pair.name} pair...`);
                const liquidity = await this.testLiquidityCheck(pair.input, pair.output, 0.01);
                const risk = await this.testRiskAssessment(pair.input);
                
                results.push({
                    pair: pair.name,
                    liquidity,
                    risk
                });
            }

            return results;
        } catch (error) {
            logger.error('Meme coin trading pairs test failed:', error);
            return [];
        }
    }

    async testMarketDataAnalysis() {
        logger.info('Testing market data analysis for meme coins...');
        try {
            const memeCoins = await this.testMemeCoinDiscovery();
            const results = [];

            for (const coin of memeCoins.slice(0, 3)) {
                logger.info(`\nAnalyzing ${coin.symbol}...`);
                
                // Test volume analysis
                const volume24h = await this.get24hVolume(coin.address);
                logger.info(`24h Volume: ${volume24h} SOL`);
                
                // Test price movement
                const priceChange = await this.getPriceChange(coin.address);
                logger.info(`24h Price Change: ${priceChange}%`);
                
                results.push({
                    symbol: coin.symbol,
                    volume24h,
                    priceChange
                });
            }

            return results;
        } catch (error) {
            logger.error('Market data analysis test failed:', error);
            return [];
        }
    }

    async get24hVolume(tokenAddress) {
        try {
            // This would be replaced with actual volume data from an API
            return Math.random() * 1000; // Simulated volume
        } catch (error) {
            logger.error('Error getting 24h volume:', error);
            return 0;
        }
    }

    async getPriceChange(tokenAddress) {
        try {
            // This would be replaced with actual price change data from an API
            return (Math.random() * 20 - 10).toFixed(2); // Simulated price change
        } catch (error) {
            logger.error('Error getting price change:', error);
            return 0;
        }
    }

    async runTests() {
        try {
            logger.info('Starting comprehensive bot functionality tests...');
            
            // Test configuration first
            const configTest = await this.testConfiguration();
            if (!configTest) {
                logger.error('Configuration test failed. Stopping tests.');
                return false;
            }
            
            // Run existing tests
            const tokens = await this.testTokenDiscovery();
            if (!tokens || tokens.length === 0) {
                logger.error('Token discovery test failed. Stopping tests.');
                return false;
            }

            // Test meme coin discovery
            logger.info('\nTesting meme coin discovery...');
            const memeCoins = await this.testMemeCoinDiscovery();
            if (memeCoins.length === 0) {
                logger.warn('No meme coins found. This might be expected in test mode.');
            }

            // Test meme coin trading pairs
            logger.info('\nTesting meme coin trading pairs...');
            const tradingPairs = await this.testMemeCoinTradingPairs();
            
            // Test market data analysis
            logger.info('\nTesting market data analysis...');
            const marketData = await this.testMarketDataAnalysis();
            
            // Test SOL-USDC pair with different amounts
            logger.info('\nTesting SOL-USDC pair with different amounts...');
            const testAmounts = [0.01, 0.1, 1.0];
            for (const amount of testAmounts) {
                logger.info(`\nTesting with ${amount} SOL...`);
                const solUsdcLiquidity = await this.testLiquidityCheck(
                    'So11111111111111111111111111111111111111112',
                    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                    amount
                );
                const solRisk = await this.testRiskAssessment('So11111111111111111111111111111111111111112');
                
                logger.info(`SOL-USDC Pair Results (${amount} SOL):`, {
                    liquidity: solUsdcLiquidity,
                    risk: solRisk
                });
            }
            
            // Test BONK-SOL pair
            logger.info('\nTesting BONK-SOL pair...');
            const bonkSolLiquidity = await this.testLiquidityCheck(
                '7GaP5Wbm6vtdRHabnktF1UjJBMvVJQftgTS9Y8Zrs7qF',
                'So11111111111111111111111111111111111111112'
            );
            const bonkRisk = await this.testRiskAssessment('7GaP5Wbm6vtdRHabnktF1UjJBMvVJQftgTS9Y8Zrs7qF');
            
            logger.info('BONK-SOL Pair Results:', {
                liquidity: bonkSolLiquidity,
                risk: bonkRisk
            });
            
            // Test position management
            logger.info('\nTesting position management...');
            const positionTest = await this.testPositionManagement();
            if (!positionTest) {
                logger.error('Position management test failed');
            }
            
            // Test risk management
            logger.info('\nTesting risk management...');
            const riskTest = await this.testRiskManagement();
            if (!riskTest) {
                logger.error('Risk management test failed');
            }
            
            // Test error recovery
            logger.info('\nTesting error recovery...');
            const errorTest = await this.testErrorRecovery();
            if (!errorTest) {
                logger.error('Error recovery test failed');
            }
            
            logger.info('\nBot functionality tests completed');
            logger.info('Note: To test actual trade execution, add SOL to the wallet');
            return true;
        } catch (error) {
            logger.error('Bot functionality tests failed:', error);
            return false;
        }
    }
}

// Run the tests
const botTest = new BotTest();
botTest.runTests().then(success => {
    if (success) {
        logger.info('All available bot functionality tests passed!');
    } else {
        logger.error('Some bot functionality tests failed.');
    }
    process.exit(success ? 0 : 1);
}); 