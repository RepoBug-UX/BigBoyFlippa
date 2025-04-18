const { Connection } = require('@solana/web3.js');
const axios = require('axios');
const config = require('../core/config');
const logger = require('../core/utils/logger');

async function testConnections() {
    try {
        logger.info('Starting connection tests...');

        // Test Helius RPC connection
        logger.info('Testing Helius RPC connection...');
        const heliusApiKey = config.get('HELIUS_API_KEY');
        const rpcEndpoint = `https://rpc.helius.xyz/?api-key=${heliusApiKey}`;
        const connection = new Connection(rpcEndpoint);
        const slot = await connection.getSlot();
        logger.info(`✓ Helius RPC connected successfully. Current slot: ${slot}`);

        // Test Jupiter API
        logger.info('Testing Jupiter API connection...');
        const jupiterResponse = await axios.get('https://quote-api.jup.ag/v6/quote', {
            params: {
                inputMint: 'So11111111111111111111111111111111111111112',
                outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
                amount: '100000000'
            }
        });
        logger.info('✓ Jupiter API connected successfully.');

        // Test Helius API
        logger.info('Testing Helius API connection...');
        const testAddress = 'vines1vzrYbzLMRdu58ou5XTby4qAqVRLmqo36NKPTg';
        const heliusResponse = await axios.get(`https://api.helius.xyz/v0/addresses/${testAddress}/balances?api-key=${heliusApiKey}`);
        logger.info('✓ Helius API connected successfully.');

        logger.info('All connection tests passed successfully!');
        return true;
    } catch (error) {
        logger.error('Connection test failed:', error.message);
        return false;
    }
}

// Run the tests
testConnections().then(success => {
    if (success) {
        logger.info('All systems are go! Ready for trading.');
    } else {
        logger.error('Some connections failed. Please check the logs above.');
    }
    process.exit(success ? 0 : 1);
}); 