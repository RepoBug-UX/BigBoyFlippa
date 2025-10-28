const { Connection } = require('@solana/web3.js');
const config = require('../core/config');

async function checkHealth() {
    try {
        // Check RPC connection
        const connection = new Connection(config.get('SOLANA_RPC_ENDPOINT'));
        await connection.getRecentBlockhash();
        
        // Check if data directories exist
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.join(process.cwd(), 'src/data');
        if (!fs.existsSync(dataDir)) {
            throw new Error('Data directory not found');
        }

        // If we get here, everything is healthy
        process.exit(0);
    } catch (error) {
        console.error('Health check failed:', error.message);
        process.exit(1);
    }
}

checkHealth(); 