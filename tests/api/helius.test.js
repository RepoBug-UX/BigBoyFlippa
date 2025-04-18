require('dotenv').config();
const axios = require('axios');
const logger = require('../../src/utils/logger');

async function testHelius() {
  try {
    // Check for API key
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
    if (!HELIUS_API_KEY) {
      throw new Error('HELIUS_API_KEY not found in environment variables');
    }

    // Test Helius RPC connection
    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    logger.info('Testing Helius RPC connection...');
    
    // Get current slot using RPC
    const rpcResponse = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 'test',
      method: 'getSlot',
    });
    logger.info(`Successfully connected to Helius RPC. Current slot: ${rpcResponse.data.result}`);

    // Test DAS API getAsset method
    logger.info('Testing DAS API getAsset method...');
    const testMint = 'So11111111111111111111111111111111111111112'; // SOL token mint
    const response = await axios.post(rpcUrl, {
      jsonrpc: '2.0',
      id: 'test',
      method: 'getAsset',
      params: {
        id: testMint,
        displayOptions: {
          showFungible: true
        }
      }
    });

    if (response.data.result) {
      logger.info('Successfully retrieved token data from DAS API');
      logger.info(JSON.stringify(response.data.result, null, 2));
    } else {
      throw new Error('No result returned from DAS API');
    }

    logger.info('All Helius API tests passed successfully!');
  } catch (error) {
    logger.error('Helius API test failed:', error.message);
    if (error.response) {
      logger.error('Error details:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    process.exit(1);
  }
}

testHelius(); 